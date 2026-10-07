const profile = window.PROFILE || {};
const resume = profile.resume || {};
const asArray = value => Array.isArray(value) ? value : [];
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
const bullets = items => `<ul>${asArray(items).map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
const tags = items => `<div class="tags">${asArray(items).map(item => `<span>${escapeHtml(item)}</span>`).join('')}</div>`;

function contactLinks() {
  const links = [];
  if (typeof profile.email === 'string' && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(profile.email)) {
    links.push(`<a class="text-link" href="mailto:${escapeHtml(profile.email)}"><span>이메일</span>${escapeHtml(profile.email)}</a>`);
  }
  if (typeof profile.github === 'string' && /^https:\/\/github\.com\/[A-Za-z0-9-]+\/?$/.test(profile.github)) {
    links.push(`<a class="text-link" href="${escapeHtml(profile.github)}" target="_blank" rel="noopener noreferrer"><span>GitHub</span>${escapeHtml(profile.github.split('/').filter(Boolean).pop())}<span class="sr-only"> (새 탭)</span></a>`);
  }
  return links.length ? `<address class="profile-contacts" aria-label="연락처와 GitHub">${links.join('')}</address>` : '';
}

function learningProjects() {
  const projects = asArray(resume.learningProjects).filter(project => project && project.title);
  if (!projects.length) return '';
  return `<section class="learning-projects" aria-labelledby="learning-title"><h3 id="learning-title">교육 팀 프로젝트</h3>${projects.map(project => `
    <article class="learning-project">
      <div class="learning-heading"><div><p class="period">${escapeHtml(project.period)}${project.category ? ` · <span class="learning-category">${escapeHtml(project.category)}</span>` : ''}</p><h4>${escapeHtml(project.title)}</h4></div>${tags(project.tags)}</div>
      ${project.description ? `<p>${escapeHtml(project.description)}</p>` : ''}
      ${asArray(project.items).length ? bullets(project.items) : ''}
      ${project.note ? `<p class="learning-note">${escapeHtml(project.note)}</p>` : ''}
    </article>`).join('')}</section>`;
}

document.querySelector('#resume-content').innerHTML = `
  <div class="resume-grid">
    <div class="profile-overview">
      <div class="profile-identity"><img class="profile-photo" src="assets/junbo-profile.jpg" width="551" height="709" alt="심준보 프로필 사진" loading="lazy" decoding="async"><div><p class="eyebrow">BACKEND ENGINEER</p><h3 class="profile-name">${escapeHtml(profile.name || '심준보')}</h3><p class="profile-role">${escapeHtml(profile.role || 'Java · Spring 백엔드 개발자')}</p></div></div>
      ${resume.headline && resume.headline !== profile.role ? `<p class="resume-headline">${escapeHtml(resume.headline)}</p>` : ''}
      ${profile.summary ? `<p class="profile-summary">${escapeHtml(profile.summary)}</p>` : ''}
      ${contactLinks()}
    </div>
    <div class="skills" aria-label="주요 기술과 경험">${asArray(profile.skills).map(([name, value]) => `<div class="skill-row"><b>${escapeHtml(name)}</b><span>${escapeHtml(value)}</span></div>`).join('')}</div>
  </div>
  <div class="resume-experience">${asArray(resume.experience).map(job => `<article class="resume-job"><div><p class="eyebrow">${escapeHtml(job.period)}</p><h3>${escapeHtml(job.company)}</h3><p class="role">${escapeHtml(job.role)}</p></div><div>${bullets(job.items)}${job.note ? `<p class="resume-note">${escapeHtml(job.note)}</p>` : ''}</div></article>`).join('')}</div>
  ${learningProjects()}
  <div class="resume-background">
    ${resume.previous ? `<div><h3>이전 직무 경험</h3><h4>${escapeHtml(resume.previous.company)}</h4><p class="period">${escapeHtml(resume.previous.period)}</p><p>${escapeHtml(resume.previous.description)}</p></div>` : ''}
    <div><h3>학력과 교육</h3>${asArray(resume.education).map(education => `<article class="education"><h4>${escapeHtml(education.title)}</h4><p class="period">${escapeHtml(education.period)}</p><p>${escapeHtml(education.description)}</p></article>`).join('')}</div>
  </div>
  <div class="strengths">${asArray(resume.strengths).map((strength, index) => `<article><span>0${index + 1}</span><h4>${escapeHtml(strength.title)}</h4><p>${escapeHtml(strength.description)}</p></article>`).join('')}</div>`;

function codeExample(code, related) {
  if (!code || !asArray(code.blocks).length) return '';
  return `<details class="code-example"><summary>구현 코드 · ${escapeHtml(code.title)}</summary><p class="code-context">${escapeHtml(code.context)}</p><div class="code-comparison ${code.blocks.length === 1 ? 'single' : ''}">${code.blocks.map(block => `<div><div class="code-label"><b>${escapeHtml(block.label)}</b><span>${escapeHtml(code.language)}</span></div><pre tabindex="0" aria-label="${escapeHtml(block.label)}"><code>${escapeHtml(block.source)}</code></pre></div>`).join('')}</div>${bullets(code.points)}<p class="code-note">${escapeHtml(code.note)}</p>${related ? `<section class="related-work"><h4>${escapeHtml(related.title)}</h4><p>${escapeHtml(related.body)}</p></section>` : ''}</details>`;
}

function comparison(headers, rows) {
  if (!asArray(rows).length) return '';
  return `<div class="table-wrap" tabindex="0" aria-label="${escapeHtml(headers.join(' · '))} 비교표"><table class="decision-table"><thead><tr>${headers.map(value => `<th scope="col">${escapeHtml(value)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map((cell, index) => index === 0 ? `<th scope="row">${escapeHtml(cell)}</th>` : `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

function screenExamples(project) {
  if (!project.screens || !asArray(project.screens.items).length) return '';
  return `<details class="screen-details" open><summary>화면과 기능의 변화</summary><p class="screen-disclaimer">${escapeHtml(project.screens.caption)}</p><div class="screen-grid">${project.screens.items.map(screen => `<figure><a class="screen-link" href="${escapeHtml(screen.src)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(screen.title)} 크게 보기 (새 탭)"><img src="${escapeHtml(screen.src)}" alt="${escapeHtml(screen.title)}. 가상 데이터로 재구성한 설명용 화면." loading="lazy"></a><figcaption><b>${escapeHtml(screen.title)}</b>${escapeHtml(screen.description)}</figcaption></figure>`).join('')}</div>${comparison(['구분', '개선 전', '개선 후'], project.changes)}</details>`;
}

document.querySelector('#project-content').innerHTML = asArray(profile.projects).map((project, index) => `
  <article class="project-card" id="case-${index + 1}"><div class="project-index">0${index + 1}</div><div class="project-body">
    <div class="project-head"><div><p>${escapeHtml(project.period)}</p><h3>${escapeHtml(project.title)}</h3></div><div class="result">${escapeHtml(project.result)}</div></div>
    <p class="project-description">${escapeHtml(project.description)}</p><p class="project-role">담당 범위 · ${escapeHtml(project.role)}</p>${tags(project.tags)}
    <ol class="project-flow" aria-label="구현 흐름">${asArray(project.flow).map(step => `<li>${escapeHtml(step)}</li>`).join('')}</ol>
    <details class="case-details"><summary>문제 해결 과정과 설계 판단</summary><div class="case-grid"><div><h4>문제</h4><p>${escapeHtml(project.problem)}</p></div><div><h4>접근과 실행</h4><p>${escapeHtml(project.action)}</p></div><div><h4>결과</h4><p>${escapeHtml(project.outcome)}</p></div></div><h4 class="case-section-title">구현에서 중요했던 판단</h4>${comparison(['쟁점', '구현한 선택', '의미와 고려사항'], project.decisions)}</details>
    ${codeExample(project.code, project.related?.batch ? null : project.related)}${project.related?.batch && typeof window.renderBatchWork === 'function' ? window.renderBatchWork(project.related) : ''}${screenExamples(project)}
  </div></article>`).join('');

document.querySelector('#career-content').innerHTML = asArray(profile.career).map(job => `<article class="career-item"><div><h3>${escapeHtml(job.company)}</h3><p class="period">${escapeHtml(job.role)}<br>${escapeHtml(job.period)}</p></div><div>${asArray(job.groups).map(([title, items]) => `<h4>${escapeHtml(title)}</h4>${bullets(items)}`).join('')}</div></article>`).join('');
