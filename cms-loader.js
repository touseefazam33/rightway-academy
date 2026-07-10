/**
 * Rightway Academy — CMS Data Loader v2.0
 * Connects your HTML website to Decap CMS data files
 * 
 * What this does:
 * 1. Loads _data/seo.json      → injects Google Analytics + AdSense dynamically
 * 2. Loads _data/contact.json  → updates phone, emails, all resource links
 * 3. Loads _data/stats.json    → updates student count, pass rate, faculty number
 * 4. Loads _data/announcements.json → updates ticker, BISE alert bar
 * 5. Loads _data/partners.json → updates partners/backlinks grid
 * Sends enrollment + MCQ + contact data → Google Sheets
 */

(async function(){
  'use strict';

  // ── UTILITY ───────────────────────────────────────────────
  async function fetchJSON(path){
    try{
      const r=await fetch(path+'?_='+Date.now());
      if(!r.ok)return null;
      return await r.json();
    }catch(e){return null;}
  }

  function loadScript(src){
    return new Promise(resolve=>{
      const s=document.createElement('script');
      s.src=src;s.async=true;
      s.onload=resolve;s.onerror=resolve;
      document.head.appendChild(s);
    });
  }

  // ── LOAD ALL DATA IN PARALLEL ─────────────────────────────
  const [seo,contact,stats,announcements,partners,faqData,blogData]=await Promise.all([
    fetchJSON('/_data/seo.json'),
    fetchJSON('/_data/contact.json'),
    fetchJSON('/_data/stats.json'),
    fetchJSON('/_data/announcements.json'),
    fetchJSON('/_data/partners.json'),
    fetchJSON('/_data/faq.json'),
    fetchJSON('/_data/blog-index.json')
  ]);

  // ── 1. GOOGLE ANALYTICS (dynamic) ────────────────────────
  if(seo&&seo.ga_id&&seo.ga_id!=='G-XXXXXXXXXX'){
    await loadScript('https://www.googletagmanager.com/gtag/js?id='+seo.ga_id);
    window.dataLayer=window.dataLayer||[];
    function gtag(){dataLayer.push(arguments);}
    window.gtag=gtag;
    gtag('js',new Date());
    gtag('config',seo.ga_id);
    console.log('[RW CMS] Google Analytics loaded:',seo.ga_id);
  }

  // ── 2. GOOGLE ADSENSE (dynamic) ──────────────────────────
  if(seo&&seo.adsense_id&&seo.adsense_id!=='ca-pub-XXXXXXXXXXXXXXXX'){
    // Set publisher ID on all ad slots
    document.querySelectorAll('ins.adsbygoogle').forEach(ins=>{
      ins.setAttribute('data-ad-client',seo.adsense_id);
    });
    await loadScript('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client='+seo.adsense_id);
    // Push all ad slots
    try{
      document.querySelectorAll('ins.adsbygoogle').forEach(()=>{
        (window.adsbygoogle=window.adsbygoogle||[]).push({});
      });
    }catch(e){}
    console.log('[RW CMS] AdSense loaded:',seo.adsense_id);
  }

  // Save sheets URL globally for form submissions
  if(seo&&seo.sheets_url&&!seo.sheets_url.includes('YOUR_ID')){
    window.RW_SHEETS_URL=seo.sheets_url;
  }

  // ── 3. CONTACT INFO ───────────────────────────────────────
  if(contact){
    const wa=contact.whatsapp||'923034263823';
    const waNum=wa.replace(/\D/g,'');
    const waDisplay='0'+waNum.slice(2,6)+'-'+waNum.slice(6);

    // All WhatsApp hrefs
    document.querySelectorAll('a[href*="wa.me"]').forEach(a=>{
      const msg=new URL(a.href).searchParams.get('text')||'';
      a.href='https://wa.me/'+waNum+(msg?'?text='+encodeURIComponent(msg):'');
    });
    // WhatsApp text displays
    document.querySelectorAll('[data-cms="whatsapp"]').forEach(el=>el.textContent=waDisplay);

    // Email 1
    if(contact.email1){
      document.querySelectorAll('a[href^="mailto:touseefazam33"]').forEach(a=>{
        a.href='mailto:'+contact.email1;
        if(a.textContent.includes('@'))a.textContent=contact.email1;
      });
    }
    // Email 2
    if(contact.email2){
      document.querySelectorAll('a[href^="mailto:info@rightway"]').forEach(a=>{
        a.href='mailto:'+contact.email2;
        if(a.textContent.includes('@'))a.textContent=contact.email2;
      });
    }
    // Resource links — update by domain match
    const linkMap=[
      ['ptbb.punjab.gov.pk',contact.ptb_url],
      ['biselahore.com',contact.bise_url],
      ['noonacademy.com',contact.noon_url],
      ['joinpakarmy.gov.pk',contact.army_url],
      ['edarulquran.com',contact.quran_url]
    ];
    document.querySelectorAll('a[href]').forEach(a=>{
      for(const [domain,url] of linkMap){
        if(url&&a.href.includes(domain)){a.href=url;break;}
      }
    });
  }

  // ── 4. STATS BAR ──────────────────────────────────────────
  if(stats){
    document.querySelectorAll('[data-cms="stat-students"]').forEach(el=>el.textContent=stats.students||'5,000+');
    document.querySelectorAll('[data-cms="stat-pass"]').forEach(el=>el.textContent=stats.pass_rate||'95%');
    document.querySelectorAll('[data-cms="stat-faculty"]').forEach(el=>el.textContent=stats.faculty||'12+');
    document.querySelectorAll('[data-cms="stat-courses"]').forEach(el=>el.textContent=stats.courses||'10+');
  }

  // ── 5. ANNOUNCEMENTS ──────────────────────────────────────
  if(announcements){
    document.querySelectorAll('[data-cms="ticker"]').forEach(el=>{
      el.textContent=announcements.ticker||el.textContent;
    });
    document.querySelectorAll('[data-cms="bise-alert"]').forEach(el=>{
      el.style.display=announcements.show_bise_alert===false?'none':'';
      const t=el.querySelector('[data-cms="bise-alert-text"]');
      if(t&&announcements.bise_alert_text)t.textContent=announcements.bise_alert_text;
    });
  }

  // ── 6. PARTNERS / BACKLINKS (dynamic from CMS) ────────────
  if(partners&&partners.links&&Array.isArray(partners.links)){
    const grid=document.getElementById('partnersGrid');
    if(grid&&partners.links.length>0){
      const extraCards=partners.links.map(p=>`
        <a href="${p.url||'#'}" target="_blank" rel="${p.nofollow?'noopener noreferrer nofollow':'noopener'}" class="card card-3d partner-card">
          <div class="partner-icon" style="background:${p.bg_color||'#EEF2FF'}">
            <i class="${p.icon||'fas fa-link'}" style="color:${p.icon_color||'#0A2463'};font-size:24px"></i>
          </div>
          <h3>${p.name||''}</h3>
          <p>${p.description||''}</p>
          <span class="partner-tag">${p.tag||'Resource'}</span>
          ${p.sponsored?'<span class="partner-tag" style="background:#FFFBEB;color:#854F0B;margin-top:4px">Sponsored</span>':''}
        </a>`).join('');
      grid.innerHTML+=extraCards;
    }
  }

  // ── 7. FAQ (CMS-added items appended, doesn't remove existing) ──
  if(faqData&&faqData.faqs&&Array.isArray(faqData.faqs)){
    const box=document.getElementById('faqExtra');
    if(box&&faqData.faqs.length>0){
      box.innerHTML=faqData.faqs.map(f=>`
        <div class="faq-item"><div class="faq-q" onclick="toggleFaq(this)"><h3>${f.q}</h3><i class="fas fa-plus"></i></div><div class="faq-a"><p>${f.a}</p></div></div>
      `).join('');
    }
  }

  // ── 8. BLOG POSTS (CMS-added posts appended to grid) ──────
  if(blogData&&blogData.posts&&Array.isArray(blogData.posts)){
    const box=document.getElementById('blogCmsExtra');
    if(box&&blogData.posts.length>0){
      const published=blogData.posts.filter(p=>p.status==='Published'||!p.status);
      box.innerHTML=published.map(p=>`
        <article class="blog-card"><div class="blog-img" style="background:linear-gradient(135deg,#0A2463,#2563EB)">📰</div><div class="blog-body"><div class="blog-meta"><span class="btag">${p.cat||'General'}</span><time>${p.date||''}</time></div><h2 class="blog-title">${p.title}</h2><p class="blog-exc">${p.description||''}</p><a href="https://wa.me/923034263823?text=${encodeURIComponent('I want to read: '+p.title)}" class="readmore">Read More <i class="fas fa-arrow-right"></i></a></div></article>
      `).join('');
    }
  }

  // ── 9. NETLIFY IDENTITY REDIRECT ──────────────────────────
  if(window.netlifyIdentity){
    window.netlifyIdentity.on('init',user=>{
      if(!user){
        window.netlifyIdentity.on('login',()=>{
          document.location.href='/admin/';
        });
      }
    });
  }

  console.log('[RW CMS] All data loaded successfully');
})();

// ═══════════════════════════════════════════════════════════
// GOOGLE SHEETS INTEGRATION
// ═══════════════════════════════════════════════════════════
// HOW TO SET UP:
// 1. Go to script.google.com → New project
// 2. Paste this Apps Script code:
/*
function doPost(e) {
  const ss = SpreadsheetApp.openById('YOUR_SPREADSHEET_ID');
  const data = JSON.parse(e.postData.contents);
  const sheet = ss.getSheetByName(data.type) || ss.insertSheet(data.type);
  if(sheet.getLastRow()===0){
    sheet.appendRow(Object.keys(data));
  }
  sheet.appendRow(Object.values(data));
  return ContentService.createTextOutput(JSON.stringify({status:'ok'}))
    .setMimeType(ContentService.MimeType.JSON);
}
*/
// 3. Deploy → New deployment → Web app → Anyone → Deploy
// 4. Copy the URL → paste in CMS → Site settings → SEO/Google → Google Sheets Script URL
// ═══════════════════════════════════════════════════════════

function sendToSheets(data){
  const url=window.RW_SHEETS_URL;
  if(!url||url.includes('YOUR_ID'))return;
  try{
    fetch(url,{
      method:'POST',
      mode:'no-cors',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(data)
    });
  }catch(e){console.log('[RW Sheets] Not connected yet');}
}

// Override the site's sendData function with our version
window.sendData=sendToSheets;
