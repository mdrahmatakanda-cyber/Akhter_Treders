/* ══════════════════════════════════════════════════════════════
   DEMO SEED DATA — ডাটাবেস খালি থাকলে প্রথমবার নমুনা ডাটা লোড হয়
   ══════════════════════════════════════════════════════════════
   এই ফাইলটি শুধুমাত্র একবার চলে — যদি products টেবিলে আগে থেকে
   কোনো ডাটা না থাকে (একদম প্রথমবার অ্যাপ খোলা হচ্ছে), তখনই এই
   নমুনা পণ্য/কাস্টমার/সাপ্লায়ার/বিক্রয়/খরচ ডাটা localStorage-এ
   ঢুকিয়ে দেওয়া হয় — যাতে demo/showcase-এর জন্য একদম খালি অ্যাপ
   না দেখিয়ে একটা জীবন্ত (populated) উদাহরণ দেখানো যায়।

   কাস্টমাইজ করতে চাইলে:
   - নিচের PRODUCT_DEFS / CUSTOMER_DEFS / SUPPLIER_DEFS অ্যারেগুলো বদলান
   - পণ্যের ক্যাটাগরি Settings > ক্যাটাগরি থেকেও পরে বদলানো যাবে
   ══════════════════════════════════════════════════════════════ */

const DEMO_PRODUCT_DEFS = [
  {name:'রূপচাঁদা সয়াবিন তেল ১ লিটার', category:'তেল', unit:'পিস', purchase_price:160, retail_price:180, wholesale_price:170, qty:40},
  {name:'প্যাকেট চিনি ১ কেজি', category:'চিনি', unit:'কেজি', purchase_price:110, retail_price:130, wholesale_price:120, qty:60},
  {name:'লাক্স সাবান ১০০ গ্রাম', category:'সাবান', unit:'পিস', purchase_price:35, retail_price:45, wholesale_price:40, qty:100},
  {name:'এনার্জি বিস্কুট প্যাকেট', category:'বিস্কুট', unit:'পিস', purchase_price:18, retail_price:25, wholesale_price:22, qty:150},
  {name:'কোল্ড ড্রিংক্স ২৫০ মিলি ক্যান', category:'কোমল পানীয়', unit:'পিস', purchase_price:25, retail_price:35, wholesale_price:30, qty:80},
];

const DEMO_CUSTOMER_DEFS = [
  {name:'মোঃ করিম মিয়া', phone:'01711111111', due:500},
  {name:'রহিমা বেগম', phone:'01812222222', due:0},
  {name:'জামাল উদ্দিন', phone:'01913333333', due:1200},
  {name:'সালমা আক্তার', phone:'01614444444', due:300},
  {name:'আব্দুল হক', phone:'01515555555', due:0},
];

const DEMO_SUPPLIER_DEFS = [
  {name:'এবি ট্রেডার্স', phone:'01611111111', due:2000},
  {name:'স্টার ডিস্ট্রিবিউশন', phone:'01711222222', due:0},
  {name:'মদিনা এন্টারপ্রাইজ', phone:'01811333333', due:800},
  {name:'ভাই ভাই সাপ্লাই', phone:'01911444444', due:0},
  {name:'ন্যাশনাল ফুড প্রোডাক্টস', phone:'01611555555', due:1500},
];

async function seedDemoDataIfEmpty(){
  try{
    const existing = await sb.from('products').select('id').limit(1);
    if (existing.data && existing.data.length > 0) return; // আগে থেকেই ডাটা আছে

    // দোকানের তথ্য + শুরুর ক্যাটাগরি লিস্ট
    await sb.from('shop_settings').insert({
      shop_name: 'স্মার্ট রিটেইল স্টোর',
      shop_subtitle: 'দৈনন্দিন প্রয়োজনীয় পণ্যের দোকান',
      address: 'ঢাকা, বাংলাদেশ',
      phone1: '01700000000',
      product_categories: ['তেল','চিনি','সাবান','বিস্কুট','কোমল পানীয়'],
      expense_categories: ['ভাড়া','বিদ্যুৎ বিল','কর্মচারী বেতন','পরিবহন','মোবাইল/ইন্টারনেট','মেইনটেন্যান্স','অন্যান্য']
    });

    // ৫টি পণ্য + স্টক
    const products = [];
    for (const p of DEMO_PRODUCT_DEFS){
      const {data} = await sb.from('products').insert({
        name:p.name, category:p.category, product_type:'পিস/প্যাকেট', unit:p.unit,
        purchase_price:p.purchase_price, retail_price:p.retail_price, wholesale_price:p.wholesale_price,
        low_stock_threshold:10
      }).select().single();
      await sb.from('stock').insert({product_id:data.id, current_quantity:p.qty});
      products.push(data);
    }

    // ৫ জন কাস্টমার
    const customers = [];
    for (const c of DEMO_CUSTOMER_DEFS){
      const {data} = await sb.from('customers').insert({name:c.name, phone:c.phone, total_due:c.due, status:'active'}).select().single();
      customers.push(data);
    }

    // ৫ জন সাপ্লায়ার
    for (const s of DEMO_SUPPLIER_DEFS){
      await sb.from('suppliers').insert({name:s.name, phone:s.phone, total_due:s.due, status:'active'});
    }

    // ৩টি নমুনা বিক্রয় (ড্যাশবোর্ড সচল দেখানোর জন্য)
    for (let i=0; i<3; i++){
      const prod = products[i];
      const qty = 2 + i;
      const total = qty * prod.retail_price;
      const {data:sale} = await sb.from('sales').insert({
        customer_id:customers[i].id, customer_name:customers[i].name,
        price_type:'retail', subtotal:total, discount:0, total_amount:total,
        cash_amount:total, due_amount:0, note:'ডেমো বিক্রয়'
      }).select().single();
      await sb.from('sale_items').insert({
        sale_id:sale.id, product_id:prod.id, product_name:prod.name,
        quantity:qty, unit:prod.unit, unit_price:prod.retail_price, discount:0, subtotal:total
      });
      await sb.from('cash_transactions').insert({transaction_type:'sale', direction:'in', amount:total, reference_id:sale.id, note:'বিক্রয় নগদ'});
    }

    // ২টি নমুনা খরচ
    const today = new Date().toISOString().slice(0,10);
    const {data:e1} = await sb.from('expenses').insert({category:'ভাড়া', expense_date:today, amount:5000, note:'দোকান ভাড়া'}).select().single();
    await sb.from('cash_transactions').insert({transaction_type:'expense', direction:'out', amount:5000, reference_id:e1.id, note:'খরচ: ভাড়া'});
    const {data:e2} = await sb.from('expenses').insert({category:'বিদ্যুৎ বিল', expense_date:today, amount:800, note:'বিদ্যুৎ বিল'}).select().single();
    await sb.from('cash_transactions').insert({transaction_type:'expense', direction:'out', amount:800, reference_id:e2.id, note:'খরচ: বিদ্যুৎ বিল'});

    console.log('✅ ডেমো ডাটা লোড হয়েছে');
  }catch(e){
    console.error('ডেমো ডাটা লোড করতে সমস্যা হয়েছে:', e);
  }
}
