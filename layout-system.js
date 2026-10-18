// Progressive disclosure keeps the experience chapter readable at screen scale.
const experience=document.querySelector('#experience');
if(experience){
  experience.classList.add('experience-chapters');
  const articles=[...experience.querySelectorAll('.experience-grid>article')];
  const chapters=articles.map((article,index)=>{
    const chapter=document.createElement('details'),summary=document.createElement('summary');
    chapter.className=`experience-chapter${article.classList.contains('experience-review')?' experience-review':''}`;
    summary.textContent=article.querySelector('h3').textContent;
    chapter.append(summary);
    for(const child of [...article.children])if(child.tagName!=='H3')chapter.append(child);
    chapter.open=index===0;article.replaceWith(chapter);return chapter;
  });
  chapters.forEach(chapter=>chapter.addEventListener('toggle',()=>{if(chapter.open)chapters.forEach(other=>{if(other!==chapter)other.open=false;});}));
}
// On a phone, optional reading and the interactive example open deliberately.
// Core chapter content stays visible; expanded content is never clipped.
const phoneLayout=matchMedia('(max-width:720px)');
const about=document.querySelector('.about-copy');
let aboutDetails;
if(about){
  const paragraphs=[...about.querySelectorAll(':scope>p')],links=about.querySelector('.about-links');
  aboutDetails=document.createElement('details');aboutDetails.className='about-detail';
  const summary=document.createElement('summary');summary.textContent='More about my practice';aboutDetails.append(summary,...paragraphs.slice(1));
  if(links)aboutDetails.append(links);about.append(aboutDetails);
}
const demo=document.querySelector('#control-demo'),demoHome=demo?.parentElement;
let demoDialog,demoButton;
if(demo){
  demoButton=document.createElement('button');demoButton.type='button';demoButton.className='play-demo-mobile';demoButton.textContent='Try the interactive example ↗';demoButton.setAttribute('aria-haspopup','dialog');
  demoHome.insertBefore(demoButton,demo);
  demoDialog=document.createElement('dialog');demoDialog.className='play-demo-dialog';demoDialog.setAttribute('aria-label','Interactive human checkpoint example');
  demoDialog.innerHTML='<form method="dialog"><button type="submit" autofocus>Close ×</button></form>';document.body.append(demoDialog);
  demoButton.addEventListener('click',()=>{demoDialog.showModal();document.body.classList.add('image-viewing');});
  demoDialog.addEventListener('close',()=>{document.body.classList.remove('image-viewing');if(phoneLayout.matches)demoButton.focus({preventScroll:true});});
}
function adaptReading(){
  if(aboutDetails)aboutDetails.open=!phoneLayout.matches;
  if(phoneLayout.matches)experience?.querySelectorAll('.experience-chapter').forEach(chapter=>{chapter.open=false;});
  if(!demo)return;
  if(phoneLayout.matches)demoDialog.append(demo);
  else{
    const wasOpen=demoDialog.open;
    const returnFocus=demo.contains(document.activeElement)?document.activeElement:demo.querySelector('button');
    if(wasOpen)demoDialog.close();demoHome.append(demo);
    if(wasOpen)returnFocus?.focus({preventScroll:true});
  }
}
phoneLayout.addEventListener('change',adaptReading);adaptReading();
