// A schematic of control flow, not a timing benchmark.
window.renderBatchWork = function (related) {
  const b = related.batch;
  const e = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const node = (region, detail) => `<div class="batch-node"><b>${region}</b><span>${detail}</span></div>`;
  const arrow = text => `<div class="batch-arrow"><span aria-hidden="true">↓</span> ${text}</div>`;
  return `<section class="related-work batch-work" id="regional-batch" aria-labelledby="batch-heading">
    <p class="batch-eyebrow">${e(related.title)}</p>
    <h4 id="batch-heading">${e(b.heading)}</h4>
    <p class="batch-lead">${e(related.body)}</p>
    <p class="project-role">담당 범위 · ${e(b.role)}</p>
    <figure class="batch-figure">
      <div class="batch-comparison">
        <section class="batch-model"><h5>${e(b.baselineLabel)}</h5><p>${e(b.baselineBody)}</p>
          <div class="batch-route-label">업무 시작과 반복에 담당자 개입</div>
          ${node('담당자', '수집 업무 수행')}${arrow('수동 작업')}
          ${node('지역별 회원수', '수집 결과 확보')}${arrow('다음 수집 시')}
          ${node('담당자 재개입', '수집 업무 반복')}
        </section>
        <section class="batch-applied"><h5>${e(b.appliedLabel)}</h5><p>${e(b.appliedBody)}</p>
          <div class="batch-route-label">스케줄러 실행 → 지역 목록을 20개씩 분할</div>
          <div class="batch-group"><b>그룹 1 · 지역 01–20</b><span>최대 20개 지역 작업</span></div>
          ${arrow('런타임이 실행 스레드에 작업 분배')}
          <div class="batch-lanes" aria-label="그룹 내 병렬 실행 예시">
            ${node('실행 레인 A', '지역 01 · 조회/저장')}
            ${node('실행 레인 B', '지역 02 · 조회/저장')}
            ${node('실행 레인 …', '그룹 안의 나머지 지역')}
          </div>
          <div class="batch-barrier">현재 그룹의 모든 작업 반환 대기</div>
          ${arrow('다음 그룹 시작')}
          <div class="batch-group batch-next"><b>그룹 2 · 지역 21–40</b><span>이후 그룹도 같은 방식으로 반복</span></div>
        </section>
      </div>
      <figcaption>${e(b.diagramCaption)}</figcaption>
    </figure>
    <details class="batch-technical" open><summary>스레드·그룹·트랜잭션 설계 자세히 보기</summary>
      <div class="batch-decisions">${b.decisions.map((d,i)=>`<article><span>0${i+1}</span><h5>${e(d.title)}</h5><p>${e(d.body)}</p></article>`).join('')}</div>
      <section class="batch-transaction" aria-labelledby="batch-tx-heading"><h5 id="batch-tx-heading">${e(b.transaction.title)}</h5><p>${e(b.transaction.body)}</p>
        <div class="batch-tx-diagram" role="group" aria-label="지역별 서비스 호출에 적용되는 별도 트랜잭션">
          ${['01','02'].map(n=>`<div class="batch-tx-row"><b>지역 ${n}<span>트랜잭션 ${n} · REQUIRED</span></b><ol>${b.transaction.steps.map(step=>`<li>${e(step)}</li>`).join('')}</ol></div>`).join('')}
          <div class="batch-tx-caption">그룹 = 실행을 나누는 단위 / 트랜잭션 = 지역 서비스의 DB 처리 단위</div>
        </div>
        <p class="batch-boundary">${e(b.transaction.note)}</p>
      </section>
      <details class="batch-code"><summary>구현 코드 · ${e(b.code.title)}</summary><div class="code-comparison single"><div><div class="code-label"><b>20개 단위 작업 분할</b><span>Java · 실행 흐름 예시</span></div><pre tabindex="0" aria-label="그룹 단위 병렬 처리 코드"><code>${e(b.code.source)}</code></pre></div></div><p class="code-note">${e(b.code.note)}</p></details>
    </details>
    <div class="batch-outcome"><b>구현 결과</b><p>${e(b.outcome)}</p></div>
  </section>`;
};
