import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Order } from '@/lib/admin';
export const runtime='nodejs';
const API='https://apiv2.shiprocket.in/v1/external';
let cached:{token:string;until:number}|null=null;
async function token(){if(cached&&cached.until>Date.now())return cached.token;const email=process.env.SHIPROCKET_EMAIL,password=process.env.SHIPROCKET_PASSWORD;if(!email||!password)throw new Error('Shipping is not configured. Add server-only Shiprocket API credentials.');const response=await fetch(API+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password}),signal:AbortSignal.timeout(15000),cache:'no-store'});const data=await response.json();if(!response.ok||typeof data.token!=='string')throw new Error('Shiprocket authentication failed. Check your API user credentials.');cached={token:data.token,until:Date.now()+8*60*60*1000};return cached.token}
export async function POST(request:NextRequest){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,service=process.env.SUPABASE_SERVICE_ROLE_KEY;const authorization=request.headers.get('authorization');
 if(!url||!key||!service)return NextResponse.json({error:'Configure Supabase and its server-only service-role key to enable shipping.'},{status:503});
 if(!authorization?.startsWith('Bearer '))return NextResponse.json({error:'Sign in to manage shipments.'},{status:401});
 const userClient=createClient(url,key,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});const {data:{user},error:authError}=await userClient.auth.getUser(authorization.slice(7));if(authError||!user)return NextResponse.json({error:'Your session has expired. Sign in again.'},{status:401});
 const permission=await userClient.rpc('has_tab',{tab_name:'orders'});if(permission.error||!permission.data)return NextResponse.json({error:'Order tab access is required.'},{status:403});
 let body;try{body=await request.json()}catch{return NextResponse.json({error:'Invalid request.'},{status:400})}
 if(!['create','track','label'].includes(body.action)||typeof body.order_id!=='string'||!/^[0-9a-f-]{36}$/i.test(body.order_id))return NextResponse.json({error:'Invalid shipment action or order ID.'},{status:400});
 const {data:order,error}=await userClient.from('orders').select('*').eq('id',body.order_id).single();if(error||!order)return NextResponse.json({error:'Order not found.'},{status:404});const o=order as Order;
 const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});let claimed=false;
 try{
  const accessToken=await token();
  const headers={Authorization:`Bearer ${accessToken}`,'Content-Type':'application/json'};
  if(body.action==='create'){
   if(!['confirmed','preparing'].includes(o.status))return NextResponse.json({error:'Confirm this order before sending it to Shiprocket.'},{status:400});
   if(o.shiprocket_order_id)return NextResponse.json({error:'This order already exists in Shiprocket.'},{status:409});
   if(o.payment_method!=='COD')return NextResponse.json({error:'Only COD checkout orders can be exported. Reconcile older manual orders separately.'},{status:400});
   if(!o.city||!o.state||!/^[1-9][0-9]{5}$/.test(o.pincode||'')||!/^[6-9][0-9]{9}$/.test(o.phone)||!o.email)return NextResponse.json({error:'This order needs a complete city, state, pincode, email and mobile number to generate shipping.'},{status:400});
   const pickup=process.env.SHIPROCKET_PICKUP_LOCATION;if(!pickup)return NextResponse.json({error:'Set the registered Shiprocket pickup location on the server.'},{status:503});
   const {length,breadth,height,weight}=body;if(![length,breadth,height,weight].every(v=>typeof v==='number'&&Number.isFinite(v)&&v>0)||[length,breadth,height].some(v=>v>200)||weight>100)return NextResponse.json({error:'Enter valid package dimensions in cm (up to 200) and weight in kg (up to 100).'},{status:400});
   const claim=await admin.rpc('claim_shipment',{p_id:o.id});if(claim.error||!claim.data)return NextResponse.json({error:'A shipment is already being created or needs reconciliation. Check Shiprocket before retrying.'},{status:409});claimed=true;
   const [first,...last]=o.customer_name.split(' ');const payload={order_id:o.id,order_date:o.created_at.slice(0,10),pickup_location:pickup,billing_customer_name:first,billing_last_name:last.join(' '),billing_address:o.address,billing_city:o.city,billing_pincode:Number(o.pincode),billing_state:o.state,billing_country:'India',billing_email:o.email,billing_phone:Number(o.phone),shipping_is_billing:true,order_items:o.items.map(i=>({name:i.name,sku:i.product_id,units:i.quantity,selling_price:i.price})),payment_method:'COD',sub_total:Number(o.total),length,breadth,height,weight};
   const response=await fetch(API+'/orders/create/adhoc',{method:'POST',headers,body:JSON.stringify(payload),signal:AbortSignal.timeout(20000),cache:'no-store'});const result=await response.json();
   if(!response.ok){const certain=[400,401,403,422].includes(response.status);await admin.from('orders').update({shipping_state:certain?'failed':'needs_review'}).eq('id',o.id);claimed=false;throw new Error(certain?'Shiprocket rejected the order. Check delivery details, package dimensions and API settings.':'Shiprocket returned an uncertain result. Reconcile the order in Shiprocket before retrying.')}
   if(!Number.isFinite(Number(result.order_id))||!Number.isFinite(Number(result.shipment_id))||!result.order_id||!result.shipment_id)throw new Error('Shiprocket returned an incomplete result. Reconcile the order in Shiprocket.');
   const saved=await admin.from('orders').update({shiprocket_order_id:Number(result.order_id),shipment_id:Number(result.shipment_id),shipping_state:'created'}).eq('id',o.id);if(saved.error)throw new Error('The provider accepted the order, but saving its reference failed. Reconcile in Shiprocket before retrying.');claimed=false;
   return NextResponse.json({message:'Order created in Shiprocket. Assign a courier and schedule pickup in your Shiprocket dashboard.',shiprocket_order_id:result.order_id,shipment_id:result.shipment_id});
  }
  if(!o.shipment_id)return NextResponse.json({error:'Create a Shiprocket order first.'},{status:400});
  if(body.action==='label'){
   const response=await fetch(API+'/courier/generate/label',{method:'POST',headers,body:JSON.stringify({shipment_id:[o.shipment_id]}),signal:AbortSignal.timeout(15000),cache:'no-store'});const result=await response.json();if(!response.ok||typeof result.label_url!=='string'||!result.label_url.startsWith('https://'))throw new Error('A shipping label is not available yet. Assign a courier/AWB in Shiprocket first.');return NextResponse.json({label_url:result.label_url,message:'Shipping label is ready.'});
  }
  const response=await fetch(API+`/courier/track/shipment/${o.shipment_id}`,{headers,signal:AbortSignal.timeout(15000),cache:'no-store'});const result=await response.json();if(!response.ok||!result.tracking_data)throw new Error('Tracking is not available yet. Assign a courier and AWB in Shiprocket, then sync again.');const data=result.tracking_data;const shipment=data.shipment_track?.[0];const tracking=typeof data.track_url==='string'&&data.track_url.startsWith('https://')?data.track_url:null;
  const saved=await admin.from('orders').update({awb_code:shipment?.awb_code?String(shipment.awb_code):null,courier_name:shipment?.courier_name?String(shipment.courier_name):null,tracking_url:tracking,shipment_status:shipment?.current_status?String(shipment.current_status):'Tracking pending'}).eq('id',o.id);if(saved.error)throw new Error('Could not save tracking information.');return NextResponse.json({message:shipment?.current_status?`Tracking: ${shipment.current_status}`:'Tracking pending. Check again after courier assignment.'});
 }catch(e){if(claimed)await admin.from('orders').update({shipping_state:'needs_review'}).eq('id',o.id);return NextResponse.json({error:e instanceof Error?e.message:'Shipping could not be completed.'},{status:502})}
}
