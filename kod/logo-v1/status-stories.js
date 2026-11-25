/* Ringo Durum akışı (2026-11-15)
   - Paylaşımlar 24 saat görünür (sunucu: api/moments.js).
   - Her durum kart olarak akışta: kişi, yazı, fotoğraf/video sayfada, altında Beğen / Yorum / Paylaş.
   - Tasarım: üstte Neon Salon şeridi (gösteriş), altı açık zemin (okuma alanı).
   - Fotoğraf göndermeden önce telefonda 1600 px JPG'ye çevrilir (bkz. toJpeg). */
(function(){
'use strict';
var page=document.getElementById('statusPage');
if(!page||page.dataset.storiesReady==='1')return;
page.dataset.storiesReady='1';
var I=window.RINGO_I18N, t=function(k,v){return I.t(k,v);};
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function num(n){n=Number(n||0);try{return I.formatNumber(n,n>=10000?{notation:'compact',maximumFractionDigits:1}:undefined);}catch(e){return String(n);}}
function ago(v){var n=Math.max(0,Math.floor((Date.now()-new Date(v).getTime())/60000));return n<1?t('status.now'):t('status.ago',{time:n<60?n+' '+t('status.minutes'):Math.floor(n/60)+' '+t('status.hours')});}
function left(v){var n=Math.max(0,Math.floor((new Date(v).getTime()-Date.now())/60000));return t('status.left',{time:n<60?n+' '+t('status.minutes'):Math.floor(n/60)+' '+t('status.hours')});}
function avatar(url,name,cls){var i=esc((String(name||'R').trim()[0]||'R').toLocaleUpperCase(I.getLanguage()));return url?'<img class="'+cls+'" src="'+esc(url)+'" alt="">':'<span class="'+cls+' is-empty">'+i+'</span>';}
async function api(path,opt){opt=opt||{};var init={method:opt.method||'GET',credentials:'same-origin',headers:{Accept:'application/json'}};if(opt.body!==undefined){init.headers['Content-Type']='application/json';init.body=JSON.stringify(opt.body);}var r=await fetch(path,init);
  // Sayfa doğrudan açıldığında (/?openStatus=1) oturum bir an hazır olmayabilir: 401 gelirse oturumu bekleyip bir kez yeniden dene
  if(r.status===401&&window.hatchable&&hatchable.auth&&hatchable.auth.getSession){try{await hatchable.auth.getSession();}catch(_){}r=await fetch(path,init);}
  var d={};try{d=await r.json();}catch(e){}if(!r.ok)throw new Error(r.status===401?t('common.loginRequired'):(d.error||t('status.unavailable')));return d;}

var ICON={
  like:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10v11H3V10h4Zm2 11h8.6a2 2 0 0 0 2-1.6l1.3-7A2 2 0 0 0 19 10h-5.5l.8-3.8A2.2 2.2 0 0 0 12.2 3L9 10v11Z"/></svg>',
  comment:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H9l-5 4V5Z"/><path d="M8 9.5h8M8 12.5h5"/></svg>',
  share:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 5l7 6-7 6v-3.5c-5 0-8.5 1.5-11 5 1-5.5 4-9.5 11-10.5V5Z"/></svg>'
};

/* ---------- Görünüm ---------- */
var style=document.createElement('style');style.id='ringo-status-feed-css';
style.textContent=[
'#statusPage.status-page{overflow-x:hidden!important;overflow-y:auto!important;touch-action:pan-y;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;background:#f7f4fc!important;background-image:none!important;color:#1c1830;color-scheme:light;--rsf-f:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;font-family:var(--rsf-f)}',
'#statusPage .ringo-status-back{position:fixed!important;left:14px!important;right:auto!important;top:calc(12px + env(safe-area-inset-top))!important;z-index:30}',
'.rsf{max-width:560px;margin:0 auto;padding-bottom:calc(120px + env(safe-area-inset-bottom))}',
'.rsf-hero{display:flex;align-items:center;justify-content:center;padding:calc(14px + env(safe-area-inset-top)) 64px 12px;background:#fff;border-bottom:1px solid #eee6f8}', /* üst görsel kaldırıldı (2026-11-23): beyaz zemin + ortalı Ringo yazısı */
'.rsf-hero img{display:block;width:auto;height:96px}',
'.rsf-card{margin:12px 10px 0;padding:14px;border-radius:18px;background:#fff;box-shadow:0 0 0 1px #e7e0f2,0 3px 12px rgba(60,30,110,.06)}',
'.rsf-compose textarea{display:block;box-sizing:border-box;width:100%;min-height:52px;max-height:180px;resize:none;padding:11px 12px;border:1px solid #ddd2ef;border-radius:14px;background:#faf8fe;color:#1c1830;font:600 16px/1.4 var(--rsf-f);outline:none;transition:min-height .2s}',
'.rsf-compose textarea:focus{min-height:96px;border-color:#7b2fe0;background:#fff;box-shadow:0 0 0 3px rgba(123,47,224,.14)}',
'.rsf-compose textarea::placeholder{color:#a39cb8}',
'.rsf-row{display:flex;align-items:center;gap:8px;margin-top:10px}',
'.rsf-chip{display:inline-flex;align-items:center;gap:6px;min-height:38px;padding:0 13px;border:0;border-radius:12px;background:#f3edfb;color:#5a17b8;font:800 13px var(--rsf-f);cursor:pointer}',
'.rsf-count{margin-left:auto;color:#a39cb8;font:700 11px var(--rsf-f)}',
'.rsf-publish{min-height:38px;padding:0 18px;border:0;border-radius:12px;color:#fff;font:800 14px var(--rsf-f);background:linear-gradient(180deg,#9450f4,#7b2fe0 45%,#5a17b8);box-shadow:inset 0 1px 0 rgba(255,255,255,.32),0 3px 10px rgba(90,23,184,.2);cursor:pointer}',
'.rsf-publish:disabled{opacity:.6}',
'.rsf-preview{position:relative;margin-top:10px;border-radius:14px;overflow:hidden;background:#efe9f8}',
'.rsf-preview img,.rsf-preview video{display:block;width:100%;max-height:260px;object-fit:contain}',
'.rsf-preview button{position:absolute;top:8px;right:8px;width:32px;height:32px;border:0;border-radius:50%;background:rgba(20,10,40,.6);color:#fff;font:20px/1 Arial,sans-serif;cursor:pointer}',
'.rsf-feedback{margin:8px 2px 0;color:#5a17b8;font:700 13px/1.4 var(--rsf-f)}.rsf-feedback:empty{display:none}',
'.rsf-head{display:flex;align-items:center;gap:10px}',
'.rsf-av{flex:0 0 46px;width:46px;height:46px;border-radius:50%;object-fit:cover;box-shadow:0 0 0 2px #fff,0 0 0 4px #cdb6f2}',
'.rsf-av.is-empty{display:grid;place-items:center;background:linear-gradient(145deg,#9450f4,#5a17b8);color:#fff;font:900 18px var(--rsf-f)}',
'.rsf-who{flex:1;min-width:0;cursor:pointer}',
'.rsf-who b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#1c1830;font:800 15px/1.25 var(--rsf-f)}',
'.rsf-who small{display:block;margin-top:2px;color:#8a83a0;font:600 12px var(--rsf-f)}',
'.rsf-who small i{font-style:normal;color:#a8792a}',
'.rsf-more{width:36px;height:36px;border:0;border-radius:50%;background:transparent;color:#8a83a0;font:900 18px/1 Arial,sans-serif;letter-spacing:1px;cursor:pointer}',
'.rsf-caption{margin:10px 2px 0;color:#1c1830;font:600 15px/1.5 var(--rsf-f);white-space:pre-wrap;overflow-wrap:anywhere}',
'.rsf-media{display:block;width:100%;margin-top:10px;padding:0;border:0;border-radius:14px;overflow:hidden;background:#efe9f8;cursor:zoom-in}',
'.rsf-media img{display:block;width:100%;max-height:520px;object-fit:cover}',
'.rsf-video{display:block;width:100%;max-height:520px;margin-top:10px;border-radius:14px;background:#120a22}',
'.rsf-acts{display:flex;align-items:center;gap:6px;margin-top:8px;padding-top:6px;border-top:1px solid #f1ecf8}',
'.rsf-act{display:inline-flex;align-items:center;gap:6px;min-height:40px;padding:0 10px;border:0;border-radius:12px;background:transparent;color:#6e6787;font:700 14px var(--rsf-f);cursor:pointer}',
'.rsf-act svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linejoin:round;stroke-linecap:round}',
'.rsf-act.is-on{color:#7b2fe0}.rsf-act.is-on svg{fill:#7b2fe0;stroke:#7b2fe0}',
'.rsf-act:active{transform:scale(.94)}',
'.rsf-act.share{margin-left:auto}',
'.rsf-more-loading{margin:14px 0;color:#8a83a0;font:700 13px var(--rsf-f);text-align:center}',
'.rsf-empty{margin:12px 10px 0;padding:26px 16px;border-radius:18px;background:#fff;box-shadow:0 0 0 1px #e7e0f2;color:#6e6787;font:700 14px/1.6 var(--rsf-f);text-align:center}',
'.rsf-sheet{position:fixed;inset:0;z-index:50;display:flex;flex-direction:column;justify-content:flex-end;background:rgba(20,10,40,.45)}',
'.rsf-sheet[hidden]{display:none}',
'.rsf-sheet-box{display:flex;flex-direction:column;max-height:78vh;border-radius:22px 22px 0 0;background:#fff;box-shadow:0 -8px 30px rgba(30,10,60,.25);padding-bottom:env(safe-area-inset-bottom)}',
'.rsf-sheet-head{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid #f1ecf8;color:#1c1830;font:900 16px var(--rsf-f)}',
'.rsf-sheet-head button{width:34px;height:34px;border:0;border-radius:50%;background:#f3edfb;color:#5a17b8;font:20px/1 Arial,sans-serif;cursor:pointer}',
'.rsf-clist{flex:1;overflow-y:auto;padding:6px 14px}',
'.rsf-c{display:flex;gap:10px;padding:10px 0;border-bottom:1px solid #f6f2fb}',
'.rsf-c .rsf-av{flex-basis:36px;width:36px;height:36px;font-size:14px;box-shadow:none}',
'.rsf-c div{flex:1;min-width:0}',
'.rsf-c b{color:#1c1830;font:800 13px var(--rsf-f)}',
'.rsf-c p{margin:2px 0 0;color:#1c1830;font:500 14px/1.45 var(--rsf-f);white-space:pre-wrap;overflow-wrap:anywhere}',
'.rsf-c small{color:#9a93ad;font:600 11px var(--rsf-f)}',
'.rsf-c small button{margin-left:8px;padding:0;border:0;background:none;color:#c9302c;font:700 11px var(--rsf-f);cursor:pointer}',
'.rsf-cempty{padding:26px 6px;color:#8a83a0;font:600 14px var(--rsf-f);text-align:center}',
'.rsf-cform{display:flex;gap:8px;padding:10px 12px;border-top:1px solid #f1ecf8}',
'.rsf-cform input{flex:1;min-width:0;min-height:42px;padding:0 12px;border:1px solid #ddd2ef;border-radius:12px;background:#faf8fe;color:#1c1830;font:600 16px var(--rsf-f);outline:none}',
'.rsf-cform input:focus{border-color:#7b2fe0;background:#fff}',
'.rsf-viewer{position:fixed;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;background:rgba(8,4,18,.94)}',
'.rsf-viewer[hidden]{display:none}',
'.rsf-viewer img{max-width:100%;max-height:100%;object-fit:contain}',
'.rsf-viewer button{position:absolute;top:calc(14px + env(safe-area-inset-top));right:14px;width:42px;height:42px;border:1px solid rgba(255,255,255,.3);border-radius:50%;background:rgba(255,255,255,.12);color:#fff;font:24px/1 Arial,sans-serif;cursor:pointer}'
].join('\n');
document.head.appendChild(style);

page.innerHTML='<button type="button" class="ringo-status-back" id="ringoStatusBack" aria-label="'+esc(t('status.back'))+'">←</button>'+
'<div class="rsf">'+
 '<header class="rsf-hero"><img src="/assets/ringo-logo.webp?v=1" alt="Ringo" width="72" height="96"></header>'+
 '<section class="rsf-card rsf-compose" id="ringoStoryComposer">'+
  '<textarea id="ringoStoryCaption" maxlength="500" rows="2" placeholder="'+esc(t('status.caption'))+'"></textarea>'+
  '<div id="ringoStoryPreview" class="rsf-preview" hidden></div>'+
  '<div class="rsf-row"><button type="button" class="rsf-chip" id="ringoStoryPhoto">▧ '+esc(t('status.photo'))+'</button><button type="button" class="rsf-chip" id="ringoStoryVideo">▷ '+esc(t('status.video'))+'</button><small class="rsf-count" id="ringoStoryCount">0 / 500</small><button type="button" class="rsf-publish" id="ringoStoryPublish">'+esc(t('status.publish'))+'</button></div>'+
  '<p class="rsf-feedback" id="ringoStoryFeedback" aria-live="polite"></p>'+
  '<input id="ringoStoryImageInput" type="file" accept="image/*" hidden><input id="ringoStoryVideoInput" type="file" accept="video/mp4,video/webm,video/quicktime" hidden>'+
 '</section>'+
 '<div id="ringoStoryFeed"><p class="rsf-empty">'+esc(t('status.loading'))+'</p></div>'+
'</div>'+
'<section class="rsf-sheet" id="ringoStoryComments" hidden role="dialog" aria-modal="true" aria-label="'+esc(t('status.comments'))+'"><div class="rsf-sheet-box"><div class="rsf-sheet-head"><span>'+esc(t('status.comments'))+'</span><button type="button" data-close-comments aria-label="'+esc(t('common.close'))+'">×</button></div><div class="rsf-clist" id="ringoStoryCommentList"></div><form class="rsf-cform" id="ringoStoryCommentForm"><input name="body" maxlength="500" autocomplete="off" placeholder="'+esc(t('status.writeComment'))+'"><button type="submit" class="rsf-publish">'+esc(t('status.send'))+'</button></form></div></section>'+
'<section class="rsf-viewer" id="ringoStoryViewer" hidden role="dialog" aria-modal="true" aria-label="'+esc(t('status.viewer'))+'"><button type="button" id="ringoStoryViewerClose" aria-label="'+esc(t('common.close'))+'">×</button><img alt=""></section>';

var $=function(id){return document.getElementById(id);};
var feed=$('ringoStoryFeed'),caption=$('ringoStoryCaption'),feedback=$('ringoStoryFeedback'),preview=$('ringoStoryPreview'),
    imageInput=$('ringoStoryImageInput'),videoInput=$('ringoStoryVideoInput'),sheet=$('ringoStoryComments'),clist=$('ringoStoryCommentList'),
    cform=$('ringoStoryCommentForm'),viewer=$('ringoStoryViewer');
var moments=[],hasMore=false,loadingMore=false,selectedFile=null,selectedType=null,previewUrl=null,openMomentId=null;

$('ringoStatusBack').addEventListener('click',function(e){e.preventDefault();e.stopPropagation();closeSheet();closeViewer();page.hidden=true;page.setAttribute('aria-hidden','true');var nav=document.getElementById('statusNavBtn');if(nav)nav.setAttribute('aria-expanded','false');});

/* ---------- Akış ---------- */
function card(m,i){
  var media='';
  if(m.media_url&&m.media_type==='video')media='<video class="rsf-video" src="'+esc(m.media_url)+'" controls playsinline preload="metadata"></video>';
  else if(m.media_url)media='<button type="button" class="rsf-media" data-zoom="'+i+'" aria-label="'+esc(t('status.tapToOpen'))+'"><img src="'+esc(m.media_url)+'" alt="" loading="lazy"></button>';
  return '<article class="rsf-card" data-i="'+i+'">'+
    '<div class="rsf-head"><span data-user-profile="'+esc(m.user_id)+'" style="display:contents">'+avatar(m.avatar_url,m.display_name,'rsf-av')+'<span class="rsf-who"><b>'+esc(m.display_name||t('chat.member'))+'</b><small>'+esc(ago(m.created_at))+' · <i>⏳ '+esc(left(m.expires_at))+'</i></small></span></span>'+
    (m.is_mine?'<button type="button" class="rsf-more" data-more="'+i+'" aria-label="'+esc(t('status.delete'))+'">•••</button>':'<button type="button" class="rsf-more" data-rep="'+i+'" aria-label="Şikayet et">•••</button>')+'</div>'+
    (m.caption?'<p class="rsf-caption">'+esc(m.caption)+'</p>':'')+media+
    '<div class="rsf-acts">'+
      '<button type="button" class="rsf-act'+(m.liked?' is-on':'')+'" data-like="'+i+'" aria-pressed="'+(m.liked?'true':'false')+'" aria-label="'+esc(t('status.like'))+'">'+ICON.like+'<span>'+num(m.like_count)+'</span></button>'+
      '<button type="button" class="rsf-act" data-comment="'+i+'" aria-label="'+esc(t('status.comment'))+'">'+ICON.comment+'<span>'+num(m.comment_count)+'</span></button>'+
      '<button type="button" class="rsf-act share" data-share="'+i+'" aria-label="'+esc(t('status.share'))+'">'+ICON.share+'</button>'+
    '</div></article>';
}
function render(){feed.innerHTML=moments.length?moments.map(card).join(''):'<p class="rsf-empty">'+esc(t('status.empty'))+'<br>'+esc(t('status.first'))+'</p>';}
function updateCard(i){var old=feed.querySelector('[data-i="'+i+'"]');if(!old)return;var tmp=document.createElement('div');tmp.innerHTML=card(moments[i],i);old.replaceWith(tmp.firstChild);}
async function load(){try{var d=await api('/api/moments');moments=d.moments||[];hasMore=!!d.has_more;render();}catch(err){feed.innerHTML='<p class="rsf-empty">'+esc(err.message||t('status.unavailable'))+'</p>';}}
// Aşağı kaydırdıkça sonraki 50 durum gelir; aynı durum iki kez eklenmez.
async function loadMore(){if(!hasMore||loadingMore||!moments.length)return;loadingMore=true;var tail=document.createElement('p');tail.className='rsf-more-loading';tail.textContent=t('status.loading');feed.appendChild(tail);
  try{var last=moments[moments.length-1],d=await api('/api/moments?before='+encodeURIComponent(last.created_at)),seen={};moments.forEach(function(m){seen[m.id]=1;});
    var fresh=(d.moments||[]).filter(function(m){return !seen[m.id];}),start=moments.length;moments=moments.concat(fresh);hasMore=!!d.has_more&&fresh.length>0;
    tail.remove();var html=fresh.map(function(m,k){return card(m,start+k);}).join('');feed.insertAdjacentHTML('beforeend',html);}
  catch(_){tail.remove();}finally{loadingMore=false;}}
page.addEventListener('scroll',function(){if(page.scrollTop+page.clientHeight>page.scrollHeight-900)loadMore();},{passive:true});

feed.addEventListener('click',async function(e){
  var b=e.target.closest('[data-like],[data-comment],[data-share],[data-zoom],[data-more],[data-rep]');if(!b)return;
  e.stopPropagation();
  var i=Number(b.dataset.like||b.dataset.comment||b.dataset.share||b.dataset.zoom||b.dataset.more||b.dataset.rep),m=moments[i];if(!m)return;
  if(b.dataset.rep!==undefined){if(window.RingoSikayet)window.RingoSikayet.ac({tur:'an',id:m.id,ad:m.display_name,sonra:function(d){if(d&&(d.gizlendi||d.engellendi)){moments.splice(i,1);render();}}});return;}
  if(b.dataset.like!==undefined){
    var on=!m.liked;m.liked=on;m.like_count=Math.max(0,Number(m.like_count||0)+(on?1:-1));updateCard(i);
    try{var r=await api('/api/moments',{method:on?'POST':'DELETE',body:{action:on?'like':'unlike',moment_id:m.id}});if(r.like_count!=null){m.like_count=r.like_count;updateCard(i);}}
    catch(err){m.liked=!on;m.like_count=Math.max(0,Number(m.like_count||0)+(on?-1:1));updateCard(i);alert(err.message);}
  }else if(b.dataset.comment!==undefined){openComments(i);}
  else if(b.dataset.share!==undefined){
    var url=location.origin+'/?openStatus=1',text=(m.caption||t('status.shareText')).slice(0,140);
    try{if(navigator.share)await navigator.share({title:'Ringo · '+t('status.title'),text:text,url:url});else if(navigator.clipboard){await navigator.clipboard.writeText(text+' '+url);feedback.textContent=t('status.linkCopied');}}catch(_){}
  }else if(b.dataset.zoom!==undefined){viewer.querySelector('img').src=m.media_url;viewer.hidden=false;}
  else if(b.dataset.more!==undefined){
    if(!confirm(t('status.deleteConfirm')))return;
    try{await api('/api/moments',{method:'DELETE',body:{action:'moment',moment_id:m.id}});moments.splice(i,1);render();}catch(err){alert(err.message);}
  }
});

/* ---------- Yorumlar ---------- */
function commentRow(c){return '<div class="rsf-c"><span data-user-profile="'+esc(c.user_id)+'" style="display:contents">'+avatar(c.avatar_url,c.display_name,'rsf-av')+'</span><div><b>'+esc(c.display_name||t('chat.member'))+'</b><p>'+esc(c.body)+'</p><small>'+esc(ago(c.created_at))+(c.is_mine?'<button type="button" data-del-comment="'+esc(c.id)+'">'+esc(t('status.delete'))+'</button>':'<button type="button" data-rep-comment="'+esc(c.id)+'" aria-label="Şikayet et">🚩</button>')+'</small></div></div>';}
async function loadComments(){var m=moments.find(function(x){return x.id===openMomentId;});if(!m)return;
  try{var d=await api('/api/moments?action=comments&moment_id='+encodeURIComponent(m.id));clist.innerHTML=d.comments.length?d.comments.map(commentRow).join(''):'<p class="rsf-cempty">'+esc(t('status.noComments'))+'</p>';clist.scrollTop=clist.scrollHeight;}
  catch(err){clist.innerHTML='<p class="rsf-cempty">'+esc(err.message)+'</p>';}}
function openComments(i){openMomentId=moments[i].id;clist.innerHTML='<p class="rsf-cempty">'+esc(t('status.loading'))+'</p>';sheet.hidden=false;loadComments();}
function closeSheet(){sheet.hidden=true;openMomentId=null;}
function syncCount(r){var i=moments.findIndex(function(x){return x.id===openMomentId;});if(i<0)return;if(r&&r.comment_count!=null)moments[i].comment_count=r.comment_count;updateCard(i);}
sheet.addEventListener('click',async function(e){
  e.stopPropagation();
  if(e.target===sheet||e.target.closest('[data-close-comments]')){closeSheet();return;}
  var rep=e.target.closest('[data-rep-comment]');if(rep){if(window.RingoSikayet)window.RingoSikayet.ac({tur:'an_yorum',id:rep.dataset.repComment,sonra:function(d){if(d&&d.gizlendi)loadComments();}});return;}
  var del=e.target.closest('[data-del-comment]');if(!del)return;
  if(!confirm(t('status.deleteCommentConfirm')))return;
  try{await api('/api/moments',{method:'DELETE',body:{action:'comment',comment_id:del.dataset.delComment}});var i=moments.findIndex(function(x){return x.id===openMomentId;});if(i>=0)moments[i].comment_count=Math.max(0,Number(moments[i].comment_count||0)-1);syncCount();loadComments();}catch(err){alert(err.message);}
});
cform.addEventListener('submit',async function(e){
  e.preventDefault();var input=cform.elements.body,text=input.value.trim(),btn=cform.querySelector('button');if(!text||!openMomentId)return;
  btn.disabled=true;
  try{var r=await api('/api/moments',{method:'POST',body:{action:'comment',moment_id:openMomentId,body:text}});input.value='';syncCount(r);await loadComments();}
  catch(err){alert(err.message);}finally{btn.disabled=false;}
});

/* ---------- Büyük görsel ---------- */
function closeViewer(){viewer.hidden=true;viewer.querySelector('img').removeAttribute('src');}
viewer.addEventListener('click',function(e){e.stopPropagation();closeViewer();});

/* ---------- Paylaşma ---------- */
// Fotoğrafı göndermeden önce telefonda standart JPG'ye çevirir ve en fazla 1600 piksele küçültür.
// Böylece etiketi yanlış dosyalar, iPhone HEIC ve çok büyük fotoğraflar da sorunsuz gider.
function toJpeg(file){return new Promise(function(resolve){if(!file||!/^image\//.test(file.type||'image/')){resolve(file);return;}var url=URL.createObjectURL(file),img=new Image();img.onload=function(){try{var max=1600,w=img.naturalWidth,h=img.naturalHeight;if(!w||!h)throw 0;var k=Math.min(1,max/Math.max(w,h));var c=document.createElement('canvas');c.width=Math.round(w*k);c.height=Math.round(h*k);var g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);g.drawImage(img,0,0,c.width,c.height);c.toBlob(function(b){URL.revokeObjectURL(url);resolve(b&&b.size?new File([b],'durum.jpg',{type:'image/jpeg'}):file);},'image/jpeg',0.85);}catch(e){URL.revokeObjectURL(url);resolve(file);}};img.onerror=function(){URL.revokeObjectURL(url);resolve(file);};img.src=url;});}
function clearFile(){selectedFile=null;selectedType=null;if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl=null;}preview.innerHTML='';preview.hidden=true;imageInput.value='';videoInput.value='';}
function chooseFile(file,type){if(!file)return;var max=type==='image'?40*1024*1024:20*1024*1024;if(file.size>max){feedback.textContent=type==='image'?t('status.photoLimit'):t('status.videoLimit');return;}clearFile();selectedFile=file;selectedType=type;previewUrl=URL.createObjectURL(file);preview.hidden=false;preview.innerHTML=(type==='image'?'<img alt="" src="'+previewUrl+'">':'<video controls playsinline src="'+previewUrl+'"></video>')+'<button type="button" id="ringoStoryPreviewClear" aria-label="'+esc(t('common.close'))+'">×</button>';feedback.textContent=type==='video'?t('status.videoDuration'):'';$('ringoStoryPreviewClear').addEventListener('click',function(e){e.stopPropagation();clearFile();feedback.textContent='';});if(type==='video'){var v=preview.querySelector('video');v.addEventListener('loadedmetadata',function(){if(v.duration>60){clearFile();feedback.textContent=t('status.videoDuration');}});}}
$('ringoStoryPhoto').addEventListener('click',function(e){e.stopPropagation();imageInput.click();});
$('ringoStoryVideo').addEventListener('click',function(e){e.stopPropagation();videoInput.click();});
imageInput.addEventListener('change',async function(){var f=this.files[0];this.value='';if(f&&window.RingoKirp){f=await window.RingoKirp.ac(f,{oran:'9:16'});}if(f)chooseFile(f,'image');}); // Kırpma: assets/ringo-kirp.js
videoInput.addEventListener('change',function(){chooseFile(this.files[0],'video');});
caption.addEventListener('input',function(){$('ringoStoryCount').textContent=caption.value.length+' / 500';caption.style.height='auto';caption.style.height=Math.min(caption.scrollHeight,180)+'px';});
$('ringoStoryPublish').addEventListener('click',async function(e){
  e.stopPropagation();var value=caption.value.trim();if(!value&&!selectedFile){feedback.textContent=t('status.textOrMedia');return;}
  var b=this;b.disabled=true;feedback.textContent=t('status.publishing');
  try{var body=new FormData();body.append('caption',value);
    if(selectedFile){var up=selectedType==='image'?await toJpeg(selectedFile):selectedFile;if(up.size>10*1024*1024&&selectedType==='image')throw new Error(t('status.photoLimit'));body.append('file',up,up.name||'durum');}
    var r=await fetch('/api/moments',{method:'POST',credentials:'same-origin',body:body}),d={};try{d=await r.json();}catch(_){}if(!r.ok)throw new Error(d.error||t('status.unavailable'));
    caption.value='';caption.style.height='';$('ringoStoryCount').textContent='0 / 500';clearFile();feedback.textContent=d.onay_bekliyor?'Durumun incelemeye alındı; onaylanınca herkes görecek.':t('status.published');await load();
document.addEventListener('visibilitychange',function(){if(!document.hidden&&!page.hidden&&feed.querySelector('.rsf-empty'))load();});
  }catch(err){feedback.textContent=err.message||t('status.unavailable');}finally{b.disabled=false;}
});

document.addEventListener('keydown',function(e){if(e.key!=='Escape'||page.hidden)return;if(!viewer.hidden){closeViewer();e.stopImmediatePropagation();}else if(!sheet.hidden){closeSheet();e.stopImmediatePropagation();}},true);
// Sayfa her açıldığında akışı tazele.
new MutationObserver(function(){if(!page.hidden)load();}).observe(page,{attributes:true,attributeFilter:['hidden']});
load();
// İlk yükleme hata verdiyse (ör. oturum geç hazır oldu) sayfaya dönünce kendiliğinden yeniden dene
document.addEventListener('visibilitychange',function(){if(!document.hidden&&!page.hidden&&feed.querySelector('.rsf-empty'))load();});
})();
