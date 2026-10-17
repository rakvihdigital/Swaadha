export type Product = { id:string; name:string; category:string; description:string; price:number; weight:string; image:string; available:boolean; stock?:number; sku?:string; long_description?:string; ingredients?:string; allergens?:string; shelf_life?:string; storage?:string; net_weight_grams?:number };
export const demoProducts: Product[] = [
{id:'demo-1',name:'Mango Pickle',category:'Pickles',description:'A little tang, a little spice, and a whole lot of nostalgia.',price:180,weight:'250 g',image:'/images/pickle.webp',available:true},
{id:'demo-2',name:'Traditional Chakkuli',category:'Snacks',description:'Golden, crisp spirals made for those just-one-more moments.',price:160,weight:'250 g',image:'/images/chakli.webp',available:true},
{id:'demo-3',name:'Besan Laddoo',category:'Sweets',description:'Slow-roasted goodness, rolled into a little celebration.',price:220,weight:'250 g',image:'/images/laddoo.webp',available:true},
{id:'demo-4',name:'Homestyle Chutney Pudi',category:'Pantry',description:'Your everyday meals, with an extra spoonful of home.',price:140,weight:'200 g',image:'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=900&q=85',available:true}
];
export const whatsapp = (text:string) => `https://wa.me/918296295658?text=${encodeURIComponent(text)}`;

export function withDetails(p:Product):Product { const sample=p.id.startsWith('demo-'); return {stock:sample?24:0,sku:sample?'SW-'+p.id.slice(-1).padStart(3,'0'):'',long_description:'',ingredients:'',allergens:'',shelf_life:'',storage:'',net_weight_grams:250,...p};}
