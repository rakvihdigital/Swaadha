import { Product, demoProducts, withDetails } from './products';
import { Category, demoCategories } from './admin';
import { supabase } from './supabase';
export async function loadMenu():Promise<{products:Product[];categories:Category[]}>{
 if(!supabase){let saved:null|{products:Product[];categories:Category[]}=null;try{saved=JSON.parse(localStorage.getItem('swaadha-admin-demo-v2')||'null')}catch{}const categories=(saved?.categories??demoCategories).filter(c=>c.enabled);return{categories,products:(saved?.products??demoProducts).map(withDetails).filter(p=>p.available&&categories.some(c=>c.name===p.category))}}
 const [menu,categories]=await Promise.all([supabase.from('products').select('*').eq('available',true).order('created_at'),supabase.from('categories').select('*').eq('enabled',true).order('name')]);if(menu.error||categories.error)throw new Error('Could not load the kitchen menu. Please try again.');return{products:(menu.data??[]).map(withDetails),categories:categories.data??[]};
}
