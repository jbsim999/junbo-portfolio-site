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

// The document view presents individual issues without changing exhibition data.
(() => {
  const container = document.getElementById('project-content');
  if (!container) return;
  const [statistics, correction, lookup] = asArray(profile.projects);
  const firstSentence = value => String(value || '').split(/(?<=[.!?])\s+/)[0];
  const remainingSentences = value => String(value || '').split(/(?<=[.!?])\s+/).slice(1).join(' ');
  const batch = statistics?.related?.batch;
  const issues = [
    statistics && { ...statistics, id: 'case-1', related: null },
    batch && {
      id: 'case-regional', title: '지역별 회원수 수집 자동화',
      period: '㈜이씨오 · 책이음 연계 서비스 · 2025.11',
      result: '200개 이상 지역 수집 자동화',
      role: batch.role,
      tags: ['스케줄러', '그룹 내 병렬 처리', '응답 검증'],
      problem: batch.baselineBody, action: `${statistics.related.body} ${batch.appliedBody}`,
      outcome: batch.outcome, batchRelated: statistics.related,
    },
    lookup && {
      ...lookup, id: 'case-3', title: '이기종 도서관 이용자 조회',
      description: firstSentence(lookup.description), role: String(lookup.role || '').split(' · ')[0],
      tags: ['Spring MVC', 'MyBatis', '응답 변환'],
      problem: firstSentence(lookup.problem), action: firstSentence(lookup.action),
      outcome: firstSentence(lookup.outcome), decisions: asArray(lookup.decisions).slice(0, 3),
      screens: null, changes: null, related: null,
    },
    correction && { ...correction, id: 'case-2' },
    lookup && {
      id: 'case-support', title: '주말민원 통합 조회 도구 개선', period: lookup.period,
      result: '지역별 상태·연체자료 통합 조회',
      description: remainingSentences(lookup.description), role: String(lookup.role || '').split(' · ').slice(1).join(' · '),
      tags: ['Spring MVC', 'JSP · AJAX', '운영 도구'],
      problem: remainingSentences(lookup.problem), action: remainingSentences(lookup.action),
      outcome: remainingSentences(lookup.outcome), decisions: asArray(lookup.decisions).slice(3),
      screens: lookup.screens, changes: lookup.changes,
    },
  ].filter(Boolean);

  container.innerHTML = issues.length ? issues.map(issue => `
    <article class="issue-card" id="${issue.id}" aria-labelledby="${issue.id}-title">
      <div class="issue-summary">
        <p class="issue-period">${escapeHtml(issue.period)}</p>
        <h3 id="${issue.id}-title">${escapeHtml(issue.title)}</h3>
        <p class="issue-result">${escapeHtml(issue.result)}</p>
        <p class="issue-problem">${escapeHtml(firstSentence(issue.problem))}</p>
        ${tags(asArray(issue.tags).slice(0, 3))}
      </div>
      <details class="issue-details" id="issue-details-${issue.id}">
        <summary><span class="issue-open-label">자세히 보기</span><span class="issue-close-label">접기</span><span class="sr-only"> · ${escapeHtml(issue.title)}</span><span class="issue-toggle-icon" aria-hidden="true">+</span></summary>
        <div class="issue-detail-body">
          ${issue.description ? `<p class="project-description">${escapeHtml(issue.description)}</p>` : ''}
          <p class="project-role">담당 범위 · ${escapeHtml(issue.role)}</p>
          <div class="issue-story"><section><h4>문제</h4><p>${escapeHtml(issue.problem)}</p></section><section><h4>해결</h4><p>${escapeHtml(issue.action)}</p></section><section class="issue-outcome"><h4>결과</h4><p>${escapeHtml(issue.outcome)}</p></section></div>
          ${asArray(issue.flow).length ? `<ol class="project-flow" aria-label="구현 흐름">${issue.flow.map(step => `<li>${escapeHtml(step)}</li>`).join('')}</ol>` : ''}
          ${asArray(issue.decisions).length ? `<h4 class="case-section-title">구현에서 중요했던 판단</h4>${comparison(['쟁점', '구현한 선택', '의미와 고려사항'], issue.decisions)}` : ''}
          ${codeExample(issue.code, null)}
          ${issue.related ? `<section class="related-work"><h4>${escapeHtml(issue.related.title)}</h4><p>${escapeHtml(issue.related.body)}</p></section>` : ''}
          ${issue.batchRelated ? (typeof window.renderBatchWork === 'function' ? window.renderBatchWork(issue.batchRelated, { showOverview: false }) : `<p class="issue-recovery">수집 구조를 표시하지 못했습니다. 페이지를 새로고침하거나 <a href="pdf/portfolio.pdf">포트폴리오 PDF</a>에서 확인해 주세요.</p>`) : ''}
          ${screenExamples(issue)}
        </div>
      </details>
    </article>`).join('') : '<p class="issue-recovery">사례를 표시하지 못했습니다. 페이지를 새로고침하거나 <a href="pdf/portfolio.pdf">포트폴리오 PDF</a>에서 확인해 주세요.</p>';

  const updateCard = detail => detail.closest('.issue-card')?.classList.toggle('is-open', detail.open);
  container.querySelectorAll('details').forEach(detail => {
    if (!detail.id.startsWith('issue-details-')) return;
    detail.addEventListener('toggle', () => updateCard(detail));
  });
  const openLinkedIssue = () => {
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
    const target = document.getElementById(id);
    if (!target || !container.contains(target)) return;
    const card = target.closest('.issue-card');
    if (!card) return;
    const detail = document.getElementById(`issue-details-${card.id}`);
    if (!detail) return;
    detail.open = true;
    updateCard(detail);
    // A legacy link may point inside another disclosure, such as batch details.
    for (let node = target; node && node !== card; node = node.parentElement) {
      if (node.tagName === 'DETAILS') node.open = true;
    }
    requestAnimationFrame(() => target.scrollIntoView({ block: 'start', behavior: 'instant' }));
  };
  window.addEventListener('hashchange', openLinkedIssue);
  openLinkedIssue();
})();

document.querySelector('#career-content').innerHTML = asArray(profile.career).map(job => `<article class="career-item"><div><h3>${escapeHtml(job.company)}</h3><p class="period">${escapeHtml(job.role)}<br>${escapeHtml(job.period)}</p></div><div>${asArray(job.groups).map(([title, items]) => `<h4>${escapeHtml(title)}</h4>${bullets(items)}`).join('')}</div></article>`).join('');

// An optional, independent document section. Build off-screen so malformed or
// unavailable personal-work data leaves the static fallback and career intact.
(() => {
  const container = document.getElementById('personal-project-content');
  if (!container) return;
  const data = window.PERSONAL_WORK;
  if (!data || !Array.isArray(data.items)) return;
  const text = value => typeof value === 'string' ? value.trim() : '';
  const strings = value => Array.isArray(value) ? value.map(text).filter(Boolean) : [];
  const element = (tag, className, value) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (value) node.textContent = value;
    return node;
  };
  const safeHref = value => {
    const href = text(value);
    if (!href || /[\u0000-\u0020\u007f\\]/.test(href)) return '';
    try {
      const url = new URL(href, location.href);
      if (url.username || url.password) return '';
      if (/^https:\/\//i.test(href)) return url.protocol === 'https:' ? href : '';
      const local = /^#[A-Za-z][A-Za-z0-9_-]*$/.test(href) || /^(?:\.\/)?[A-Za-z0-9][A-Za-z0-9_./-]*\.(?:html?|pdf)(?:[?#][^\s]*)?$/i.test(href);
      return local && !href.split(/[/?#]/).includes('..') && url.origin === location.origin ? href : '';
    } catch { return ''; }
  };
  const appendParagraph = (parent, title, value) => {
    const content = text(value);
    if (!content) return;
    parent.append(element('h4', '', title), element('p', '', content));
  };
  const appendPreview = (card, preview, title) => {
    if (!preview) return;
    const src = text(preview.src);
    const alt = text(preview.alt);
    const caption = text(preview.caption);
    if (!/^assets\/[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:png|webp)$/i.test(src) || !alt || !caption) return;
    if (![preview.width, preview.height].every(value => Number.isInteger(value) && value > 0)) return;

    const figure = element('figure', 'personal-work-preview');
    const image = element('img', '');
    image.src = src;
    image.alt = alt;
    image.width = preview.width;
    image.height = preview.height;
    image.loading = 'lazy';
    image.decoding = 'async';
    figure.append(image);

    const description = element('figcaption', '', caption);
    const source = safeHref(preview.source);
    if (source) {
      const link = element('a', '', 'README에서 원본 보기');
      link.href = source;
      link.setAttribute('aria-label', `${title} README에서 원본 보기`);
      description.append(link);
    }
    figure.append(description);
    card.append(figure);
  };

  try {
    const fragment = document.createDocumentFragment();
    const intro = text(data.intro);
    const approach = text(data.aiApproach);
    if (intro) fragment.append(element('p', 'personal-work-intro', intro));
    if (approach) fragment.append(element('p', 'personal-work-ai', approach));
    const cards = element('div', 'personal-work-list');
    const usedIds = new Set();

    data.items.forEach((item, index) => {
      if (!item || typeof item !== 'object') return;
      const title = text(item.title);
      const summary = text(item.summary);
      if (!title || !summary) return;
      const candidate = text(item.id);
      const baseId = /^[a-z][a-z0-9-]*$/.test(candidate) ? candidate : `item-${index + 1}`;
      let id = baseId;
      let suffix = 2;
      while (usedIds.has(id)) id = `${baseId}-${suffix++}`;
      usedIds.add(id);
      const card = element('article', 'personal-work-card');
      card.id = `personal-${id}`;
      const heading = element('h3', '', title);
      heading.id = `${card.id}-title`;
      card.setAttribute('aria-labelledby', heading.id);
      const meta = element('div', 'personal-work-meta');
      if (text(item.category)) meta.append(element('span', 'personal-work-category', text(item.category)));
      if (text(item.status)) meta.append(element('span', 'personal-work-status', text(item.status)));
      if (meta.childElementCount) card.append(meta);
      card.append(heading, element('p', 'personal-work-summary', summary));
      const technologies = strings(item.tags);
      if (technologies.length) {
        const tagList = element('ul', 'personal-work-tags');
        tagList.setAttribute('aria-label', '사용 기술');
        technologies.forEach(technology => tagList.append(element('li', '', technology)));
        card.append(tagList);
      }
      if (text(item.role)) {
        const role = element('p', 'personal-work-role');
        role.append(element('strong', '', '담당 역할'), document.createTextNode(text(item.role)));
        card.append(role);
      }
      appendPreview(card, item.preview, title);

      const details = element('details', 'personal-work-details');
      const labels = item.labels && typeof item.labels === 'object' ? item.labels : {};
      details.append(element('summary', '', `${title} · ${text(labels.details) || text(labels.decisions) || '구현과 검증 내용'}`));
      const body = element('div', 'personal-work-detail-body');
      const focus = strings(item.focus);
      if (focus.length) {
        const list = element('ul', 'personal-work-focus');
        focus.forEach(point => list.append(element('li', '', point)));
        body.append(element('h4', '', text(labels.focus) || '핵심 구현'), list);
      }
      const decisions = Array.isArray(item.decisions) ? item.decisions.filter(decision => decision && text(decision.title) && text(decision.body)) : [];
      if (decisions.length) {
        const list = element('dl', 'personal-work-decisions');
        decisions.forEach(decision => list.append(element('dt', '', text(decision.title)), element('dd', '', text(decision.body))));
        body.append(element('h4', '', text(labels.decisions) || '기술적 선택'), list);
      }
      appendParagraph(body, text(labels.validation) || '검증', item.validation);
      appendParagraph(body, '현재 범위', item.scope);
      if (body.childElementCount) {
        details.append(body);
        card.append(details);
      }

      const links = element('div', 'personal-work-links');
      if (Array.isArray(item.links)) item.links.forEach(link => {
        if (!link || !text(link.label)) return;
        const href = safeHref(link.href);
        if (!href) return;
        const anchor = element('a', '', text(link.label));
        anchor.setAttribute('href', href);
        if (/^https:\/\//i.test(href)) {
          anchor.target = '_blank';
          anchor.rel = 'noopener noreferrer';
          anchor.append(element('span', 'sr-only', ' (새 탭)'));
        }
        links.append(anchor);
      });
      if (links.childElementCount) card.append(links);
      cards.append(card);
    });

    if (!cards.childElementCount) return;
    fragment.append(cards);
    container.replaceChildren(fragment);
  } catch {
    // The existing static message remains available when optional data fails.
  }
})();
