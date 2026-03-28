// 말풍선 컴포넌트 — 예리 채팅 UI / 모바일 투자판단형 분석 카드
'use client';
import { useState } from 'react';

export interface RecItem {
  ticker: string; name: string; desc?: string;
  totalScore?: number; reason?: string;
  price?: number; changePct?: number;
}
export interface RecData {
  strongPicks?: RecItem[];
  excluded?: Array<{ ticker: string; reason: string }>;
  meta?: { scannedCount: number; elapsedMs: number };
}
export interface AnalysisData {
  verdict: string;
  action: string;
  totalScore: number;
  scores: {
    growth: number | null;
    profitability: number | null;
    stability: number | null;
    valuation: number | null;
    momentum: number | null;
    newsSentiment: number | null;
  };
  metrics?: Record<string, { value: number; source: string }>;
  newsClassified?: Array<{ title: string; source: string; type: string; strength: string; trust: string; duration: string }>;
  warnings?: string[];
  peers?: string[] | null;
}
export interface Message {
  role: "user" | "bot";
  content: string;
  time: string;
  date?: string;
  ticker?: string;
  name?: string;
  type?: string;
  candidates?: Array<{ ticker: string; name: string; similarity?: number; confidence?: number; desc?: string; tier?: string; price?: number; changePct?: number }>;
  expectedQuestions?: string[];
  recData?: RecData;
  analysisData?: AnalysisData;
}

interface Props {
  message: Message;
  showAvatar?: boolean;
  onSend?: (text: string) => void;
  onToggleWatchlist?: (ticker: string) => void;
}

// 날짜 구분선
export function DateDivider({ label }: { label: string }) {
  return (
    <div className="date-divider">
      <span>{label}</span>
    </div>
  );
}

function fmtCurrency(ticker: string) {
  return ticker.endsWith('.KS') || ticker.endsWith('.KQ') ? '₩' : '$';
}

function ChangeText({ pct }: { pct?: number | null }) {
  if (pct == null) return null;
  const color = pct >= 0 ? '#059669' : '#dc2626';
  const sign = pct > 0 ? '+' : '';
  return <span style={{ color, fontWeight: 600 }}>{sign}{pct.toFixed(2)}%</span>;
}

// ── 판단 배지 컴포넌트 ──
function VerdictBadge({ verdict }: { verdict: string }) {
  let bg = '#f3f4f6'; let color = '#374151'; let icon = '⚖️';
  if (verdict.includes('매수')) { bg = '#dcfce7'; color = '#166534'; icon = '🟢'; }
  else if (verdict.includes('관망')) { bg = '#fef9c3'; color = '#854d0e'; icon = '🟡'; }
  else if (verdict.includes('리스크') || verdict.includes('회피') || verdict.includes('주의')) { bg = '#fee2e2'; color = '#991b1b'; icon = '🔴'; }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: bg, color, fontWeight: 700, fontSize: 13,
      padding: '4px 12px', borderRadius: 20, letterSpacing: '-0.02em',
    }}>{icon} {verdict}</span>
  );
}

// ── 아코디언 섹션 ──
function AccordionSection({ title, summary, children, defaultOpen = false }: {
  title: string; summary?: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{
      background: '#fff', borderRadius: 14, marginBottom: 8,
      border: '1px solid rgba(0,0,0,0.06)',
      boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
      overflow: 'hidden',
    }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', padding: '12px 14px',
          background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontSize: 13, fontWeight: 700, color: '#1a2233',
          textAlign: 'left',
        }}
      >
        <span>{title}{summary ? ` ${summary}` : ''}</span>
        <span style={{ fontSize: 11, color: '#9ca3af', transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }}>▼</span>
      </button>
      {open && (
        <div style={{ padding: '0 14px 14px', fontSize: 13, lineHeight: 1.7, color: '#374151' }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ── 점수 바 ──
function ScoreBar({ label, val, color }: { label: string; val: number | null; color: string }) {
  if (val == null) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
      <span style={{ width: 72, fontSize: 11, fontWeight: 600, color: '#6b7280' }}>{label}</span>
      <span style={{ fontSize: 11, color: '#9ca3af' }}>데이터 부족</span>
    </div>
  );
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
      <span style={{ width: 72, fontSize: 11, fontWeight: 600, color: '#6b7280' }}>{label}</span>
      <div style={{ flex: 1, height: 5, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${val}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.8s ease-out' }} />
      </div>
      <span style={{ width: 24, textAlign: 'right', fontSize: 11, fontWeight: 700, color }}>{val}</span>
    </div>
  );
}

// ── GPT markdown → 섹션 파싱 ──
function parseAnalysisContent(content: string) {
  const sections: Record<string, string> = {};
  // 핵심 섹션 패턴
  const patterns: [string, RegExp][] = [
    ['summary', /##\s*🎯\s*한줄\s*요약\s*\n([\s\S]*?)(?=\n##\s|$)/],
    ['upside', /##\s*📈\s*상승\s*가능성\s*요인\s*\n([\s\S]*?)(?=\n##\s|$)/],
    ['downside', /##\s*📉\s*하락\s*리스크\s*요인\s*\n([\s\S]*?)(?=\n##\s|$)/],
    ['news', /##\s*📰\s*뉴스\s*심리\s*분석\s*\n([\s\S]*?)(?=\n##\s|$)/],
    ['caution', /##\s*⚠️\s*해석\s*주의사항?\s*\n([\s\S]*?)(?=\n##\s|$)/],
    ['verdict', /##\s*💡\s*종합\s*판단\s*\n([\s\S]*?)(?=\n##\s|$)/],
    ['verify', /##\s*🔍\s*검증\s*상태\s*\n([\s\S]*?)(?=\n##\s|$)/],
  ];
  for (const [key, re] of patterns) {
    const m = content.match(re);
    if (m) sections[key] = m[1].trim();
  }
  // 한줄 액션, 핵심 액션, 진입 타이밍, 목표 관점, 동종 업계 추출
  const actionLine = content.match(/\*\*🚀\s*한줄\s*액션\*\*:\s*(.*)/);
  const coreAction = content.match(/\*\*🎯\s*핵심\s*액션\*\*:\s*(.*)/);
  const timing = content.match(/\*\*⏱️\s*진입\s*타이밍\*\*:\s*(.*)/);
  const outlook = content.match(/\*\*🔭\s*목표\s*관점\*\*:\s*(.*)/);
  const peersMatch = content.match(/\*\*💡\s*동종\s*업계\s*관심\s*종목\*\*:\s*(.*)/);

  if (actionLine) sections['actionLine'] = actionLine[1].trim();
  if (coreAction) sections['coreAction'] = coreAction[1].trim();
  if (timing) sections['timing'] = timing[1].trim();
  if (outlook) sections['outlook'] = outlook[1].trim();
  if (peersMatch) sections['peers'] = peersMatch[1].trim();

  return sections;
}

// ── 지표 카드 ──
function MetricCard({ label, value, source, isRisk, isPositive }: {
  label: string; value: string; source?: string; isRisk?: boolean; isPositive?: boolean;
}) {
  let valColor = '#1a2233';
  if (isRisk) valColor = '#dc2626';
  else if (isPositive) valColor = '#059669';
  return (
    <div style={{
      background: '#fff', borderRadius: 12, padding: '10px 12px',
      border: isRisk ? '1px solid #fecaca' : '1px solid rgba(0,0,0,0.05)',
      boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
      minWidth: 0,
    }}>
      <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 800, color: valColor, letterSpacing: '-0.02em' }}>{value}</div>
      {source && <div style={{ fontSize: 9, color: '#d1d5db', marginTop: 2 }}>{source}</div>}
    </div>
  );
}

// ── 분석 결과 전용 렌더러 ──
function AnalysisResultCard({ message, onSend, onToggleWatchlist }: {
  message: Message; onSend?: (text: string) => void; onToggleWatchlist?: (ticker: string) => void;
}) {
  const ad = message.analysisData!;
  const parsed = parseAnalysisContent(message.content);
  const m = ad.metrics || {};

  // 전일비 색상
  const changePct = m.changePct?.value;
  const isUp = typeof changePct === 'number' && changePct > 0;
  const isDown = typeof changePct === 'number' && changePct < 0;

  // 핵심 리스크 추출 (downside 첫 2줄)
  const risks = (parsed.downside || '').split('\n').filter(l => l.trim().startsWith('1.') || l.trim().startsWith('2.')).map(l => l.replace(/^\d+\.\s*/, '').replace(/\[.*?\]\s*/, '').split('—')[0].trim()).slice(0, 2);

  // 동종 업계 pill 추출
  const peerNames = (parsed.peers || '').split(/[/·,]/).map(s => s.trim()).filter(s => s.length > 0 && s.length < 30).slice(0, 4);

  return (
    <div style={{ maxWidth: 'min(92%, 420px)', minWidth: 260 }}>
      {/* ═══ 1. 종합 판단 요약 카드 (최상단) ═══ */}
      <div style={{
        background: 'linear-gradient(145deg, #ffffff 0%, #f0fdf4 100%)',
        borderRadius: 20, padding: '18px 16px',
        marginBottom: 10,
        boxShadow: '0 4px 20px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,1)',
        border: '1px solid rgba(46,168,90,0.12)',
      }}>
        {/* 타이틀 + 액션 버튼 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#1a2233', letterSpacing: '-0.02em' }}>
              {message.name || message.ticker}
            </div>
            {message.ticker && (
              <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, marginTop: 1 }}>{message.ticker}</div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {message.ticker && (
              <button
                onClick={() => {
                  if (onToggleWatchlist) onToggleWatchlist(message.ticker!);
                  else {
                    const ls = JSON.parse(localStorage.getItem('yeri_watchlist') || '[]');
                    if (!ls.some((x:any)=>x.ticker===message.ticker)) {
                      ls.push({ ticker: message.ticker, name: message.name || message.ticker, addedAt: Date.now() });
                      localStorage.setItem('yeri_watchlist', JSON.stringify(ls));
                      alert('⭐ 관심종목에 추가되었습니다.');
                    } else alert('이미 관심종목에 있습니다.');
                  }
                }}
                style={{ background: '#f1f3f5', border: 'none', borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 13 }}
                title="관심종목 추가"
              >⭐</button>
            )}
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: `${message.name || message.ticker} 분석`, text: ad.action || "투자 분석" });
                } else {
                  navigator.clipboard.writeText(message.content);
                  alert('클립보드에 복사되었습니다.');
                }
              }}
              style={{ background: '#f1f3f5', border: 'none', borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 13 }}
            >🔗</button>
          </div>
        </div>

        {/* 판단 배지 + 총점 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <VerdictBadge verdict={ad.verdict} />
          <span style={{
            fontSize: 22, fontWeight: 800,
            color: ad.totalScore >= 60 ? '#059669' : ad.totalScore >= 35 ? '#d97706' : '#dc2626',
          }}>
            {ad.totalScore}<span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 600 }}>/100</span>
          </span>
        </div>

        {/* 한줄 액션 */}
        {parsed.actionLine && (
          <div style={{
            background: 'rgba(0,0,0,0.03)', borderRadius: 12, padding: '10px 12px',
            fontSize: 13, fontWeight: 600, color: '#1a2233', lineHeight: 1.5, marginBottom: 10,
          }}>🚀 {parsed.actionLine}</div>
        )}

        {/* 핵심 정보 그리드 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
          {parsed.coreAction && (
            <div style={{ gridColumn: '1 / -1', background: '#f8fafc', borderRadius: 10, padding: '8px 10px', fontSize: 12, color: '#374151' }}>
              🎯 {parsed.coreAction}
            </div>
          )}
          {parsed.timing && (
            <div style={{ background: '#f8fafc', borderRadius: 10, padding: '8px 10px', fontSize: 12, color: '#374151' }}>
              ⏱️ {parsed.timing}
            </div>
          )}
          {parsed.outlook && (
            <div style={{ background: '#f8fafc', borderRadius: 10, padding: '8px 10px', fontSize: 12, color: '#374151' }}>
              🔭 {parsed.outlook}
            </div>
          )}
        </div>

        {/* 핵심 리스크 */}
        {risks.length > 0 && (
          <div style={{ background: '#fef2f2', borderRadius: 10, padding: '8px 10px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#991b1b', marginBottom: 4 }}>⚠️ 핵심 리스크</div>
            {risks.map((r, i) => (
              <div key={i} style={{ fontSize: 11, color: '#7f1d1d', lineHeight: 1.5, marginBottom: 2 }}>• {r}</div>
            ))}
          </div>
        )}
      </div>

      {/* ═══ 2. 한줄 요약 ═══ */}
      {parsed.summary && (
        <div style={{
          background: '#fff', borderRadius: 14, padding: '12px 14px',
          marginBottom: 8, fontSize: 13, fontWeight: 500, color: '#374151',
          lineHeight: 1.6, border: '1px solid rgba(0,0,0,0.05)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}>
          💬 {parsed.summary.slice(0, 120)}
        </div>
      )}

      {/* ═══ 3. 핵심 팩트 지표 그리드 ═══ */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 6, marginBottom: 8,
      }}>
        {m.price && <MetricCard label="현재가" value={`$${Number(m.price.value).toLocaleString()}`} source={m.price.source} />}
        {m.changePct && <MetricCard label="전일비" value={`${Number(m.changePct.value) > 0 ? '+' : ''}${Number(m.changePct.value).toFixed(2)}%`} source={m.changePct.source} isPositive={isUp} isRisk={isDown} />}
        {m.per && <MetricCard label="PER" value={Number(m.per.value).toFixed(1)} source={m.per.source} isRisk={Number(m.per.value) > 100 || Number(m.per.value) < 0} />}
        {m.eps && <MetricCard label="EPS" value={`$${Number(m.eps.value).toFixed(2)}`} source={m.eps.source} />}
        {m.roe && <MetricCard label="ROE" value={`${Number(m.roe.value).toFixed(1)}%`} source={m.roe.source} isPositive={Number(m.roe.value) > 15} />}
        {m.de && <MetricCard label="D/E" value={Number(m.de.value).toFixed(1)} source={m.de.source} isRisk={Number(m.de.value) > 150} />}
        {m.fcf && <MetricCard label="FCF" value={formatLargeNum(Number(m.fcf.value))} source={m.fcf.source} isRisk={Number(m.fcf.value) < 0} isPositive={Number(m.fcf.value) > 0} />}
        {m.rsi && <MetricCard label="RSI(14)" value={Number(m.rsi.value).toFixed(1)} source={m.rsi.source} />}
      </div>

      {/* ═══ 4. 아코디언 상세 섹션들 ═══ */}
      {parsed.upside && (
        <AccordionSection title="📈 상승 가능성 요인" summary={`(${(parsed.upside.match(/^\d+\./gm) || []).length}개)`}>
          <div style={{ whiteSpace: 'pre-wrap' }}>{parsed.upside}</div>
        </AccordionSection>
      )}
      {parsed.downside && (
        <AccordionSection title="📉 하락 리스크 요인" summary={`(${(parsed.downside.match(/^\d+\./gm) || []).length}개)`}>
          <div style={{ whiteSpace: 'pre-wrap' }}>{parsed.downside}</div>
        </AccordionSection>
      )}

      {/* 뉴스 심리 분석 */}
      {(ad.newsClassified && ad.newsClassified.length > 0) && (
        <AccordionSection title="📰 뉴스 심리" summary={`(${ad.newsClassified.length}건)`}>
          {ad.newsClassified.map((nc, i) => (
            <div key={i} style={{ marginBottom: 8, padding: '8px 10px', background: '#f9fafb', borderRadius: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#1a2233', marginBottom: 3 }}>{nc.title?.slice(0, 60)}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 10, background: '#e0f2fe', color: '#0369a1', padding: '1px 6px', borderRadius: 6 }}>{nc.type}</span>
                <span style={{ fontSize: 10, background: '#f3f4f6', color: '#6b7280', padding: '1px 6px', borderRadius: 6 }}>강도:{nc.strength}</span>
                <span style={{ fontSize: 10, background: '#f3f4f6', color: '#6b7280', padding: '1px 6px', borderRadius: 6 }}>{nc.trust}</span>
                <span style={{ fontSize: 10, background: '#f3f4f6', color: '#6b7280', padding: '1px 6px', borderRadius: 6 }}>{nc.duration}</span>
              </div>
            </div>
          ))}
          {parsed.news && <div style={{ marginTop: 6, fontSize: 12, color: '#6b7280', whiteSpace: 'pre-wrap' }}>{parsed.news.split('→')[1]?.trim()}</div>}
        </AccordionSection>
      )}

      {/* 6대 부문 점수 */}
      <AccordionSection title="💯 6대 부문 점수" summary={`(종합: ${ad.totalScore})`}>
        <ScoreBar label="🚀 성장성" val={ad.scores.growth} color="#3b82f6" />
        <ScoreBar label="💰 수익성" val={ad.scores.profitability} color="#10b981" />
        <ScoreBar label="🛡️ 재무안정" val={ad.scores.stability} color="#06b6d4" />
        <ScoreBar label="📊 밸류에이션" val={ad.scores.valuation} color="#f59e0b" />
        <ScoreBar label="🏄 모멘텀" val={ad.scores.momentum} color="#8b5cf6" />
        <ScoreBar label="📰 뉴스심리" val={ad.scores.newsSentiment} color="#ec4899" />
      </AccordionSection>

      {/* 해석 주의 */}
      {(parsed.caution || (ad.warnings && ad.warnings.length > 0)) && (
        <AccordionSection title="⚠️ 해석 주의사항">
          {ad.warnings?.map((w, i) => <div key={i} style={{ fontSize: 12, color: '#9ca3af', marginBottom: 3 }}>• {w}</div>)}
          {parsed.caution && <div style={{ fontSize: 12, color: '#9ca3af', whiteSpace: 'pre-wrap', marginTop: 4 }}>{parsed.caution}</div>}
        </AccordionSection>
      )}

      {/* 검증 상태 */}
      {parsed.verify && (
        <AccordionSection title="🔍 검증 상태">
          <div style={{ fontSize: 12, color: '#6b7280', whiteSpace: 'pre-wrap' }}>{parsed.verify}</div>
        </AccordionSection>
      )}

      {/* ═══ 5. 동종 업계 관심 종목 (pill 형태) ═══ */}
      {peerNames.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', marginBottom: 6 }}>💡 동종 업계 관심 종목</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {peerNames.map((p, i) => (
              <span key={i} style={{
                padding: '5px 12px', borderRadius: 20,
                background: '#f0f9ff', border: '1px solid #bae6fd',
                fontSize: 12, fontWeight: 600, color: '#0369a1',
                cursor: 'default',
              }}>{p}</span>
            ))}
          </div>
        </div>
      )}

      {/* 시간 */}
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, paddingLeft: 1 }}>
        {message.time}
      </div>
    </div>
  );
}

function formatLargeNum(val: number): string {
  const abs = Math.abs(val);
  if (abs >= 1e12) return `$${(val / 1e12).toFixed(1)}T`;
  if (abs >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `$${(val / 1e6).toFixed(0)}M`;
  return `$${val.toLocaleString()}`;
}

export default function MessageBubble({ message, showAvatar = true, onSend, onToggleWatchlist }: Props) {
  const isUser = message.role === "user";
  const hasRichContent = message.type === "candidates" || message.type === "recommendation" || (message.expectedQuestions && message.expectedQuestions.length > 0);

  /* ── 유저 말풍선 (우측, 그린) ── */
  if (isUser) {
    return (
      <div style={{
        display: "flex", justifyContent: "flex-end",
        alignItems: "flex-end", gap: 5, margin: "1px 0",
      }}>
        <span style={{ fontSize: 10, color: "var(--text-muted)", flexShrink: 0, marginBottom: 1 }}>
          {message.time}
        </span>
        <div
          className="bubble-user-tail"
          style={{
            maxWidth: "66%",
            padding: "10px 14px",
            borderRadius: "18px 18px 4px 18px",
            background: "var(--bubble-user-bg)",
            color: "var(--bubble-user-text)",
            fontSize: 14,
            lineHeight: 1.65,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            fontWeight: 400,
          }}
        >
          {message.content}
        </div>
      </div>
    );
  }

  /* ── 분석 결과 전용 UI (analysisData 있을 때) ── */
  if (message.analysisData && message.analysisData.metrics && Object.keys(message.analysisData.metrics).length > 0) {
    return (
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, margin: "1px 0" }}>
        <div style={{ width: 36, flexShrink: 0 }}>
          {showAvatar && (
            <div style={{
              width: 36, height: 36, borderRadius: 12,
              background: "linear-gradient(135deg, #2ea85a 0%, #3fca6b 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18,
              boxShadow: "0 2px 6px rgba(63,202,107,0.25)",
            }}>📈</div>
          )}
        </div>
        <div>
          {showAvatar && (
            <div style={{ fontSize: 11, fontWeight: 700, color: "#3a4a5c", marginBottom: 5, paddingLeft: 1 }}>
              예리
            </div>
          )}
          <AnalysisResultCard message={message} onSend={onSend} onToggleWatchlist={onToggleWatchlist} />

          {/* 예상 질문 버튼 */}
          {message.expectedQuestions && message.expectedQuestions.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6, paddingLeft: 2 }}>💡 이어서 물어보기</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {message.expectedQuestions.map((q, j) => (
                  <button
                    key={j}
                    onClick={() => onSend?.(q)}
                    style={{
                      padding: "7px 14px", borderRadius: 20,
                      background: "var(--accent-light)", border: "1px solid #c8efd8",
                      color: "var(--nav-active-color)", fontSize: 12, fontWeight: 500,
                      cursor: "pointer", textAlign: "left",
                      transition: "all 0.15s ease",
                      whiteSpace: "nowrap", minHeight: 0,
                    }}
                    onMouseOver={e => { e.currentTarget.style.background = "#d4f5e0"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                    onMouseOut={e => { e.currentTarget.style.background = "var(--accent-light)"; e.currentTarget.style.transform = "none"; }}
                  >{q}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ── 봇 말풍선 (일반 — 기존 유지) ── */
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 8, margin: "1px 0" }}>
      <div style={{ width: 36, flexShrink: 0 }}>
        {showAvatar && (
          <div style={{
            width: 36, height: 36, borderRadius: 12,
            background: "linear-gradient(135deg, #2ea85a 0%, #3fca6b 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18,
            boxShadow: "0 2px 6px rgba(63,202,107,0.25)",
          }}>📈</div>
        )}
      </div>
      <div style={{ maxWidth: hasRichContent ? "min(88%, 420px)" : "66%", minWidth: hasRichContent ? 260 : undefined }}>
        {showAvatar && (
          <div style={{ fontSize: 11, fontWeight: 700, color: "#3a4a5c", marginBottom: 5, paddingLeft: 1 }}>
            예리
          </div>
        )}

        {/* 기존 스코어 카드 (analysisData는 있지만 metrics가 없는 경우 폴백) */}
        {message.analysisData && (
          <div style={{
            background: "linear-gradient(145deg, #ffffff 0%, #f9fbfc 100%)",
            borderRadius: "18px", padding: "16px", marginBottom: "10px",
            boxShadow: "0 4px 15px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,1)",
            border: "1px solid rgba(0,0,0,0.03)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#1a2233" }}>{message.analysisData.verdict}</div>
                {message.ticker && <div style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 600, marginTop: 2 }}>{message.name || message.ticker}</div>}
              </div>
            </div>
            <div style={{ background: "rgba(0,0,0,0.02)", padding: "10px 12px", borderRadius: 12 }}>
              <div style={{ fontSize: 13, lineHeight: 1.5, color: "var(--text-primary)" }}>{message.analysisData.action}</div>
            </div>
          </div>
        )}

        <div
          className="bubble-bot-tail"
          style={{
            padding: "11px 15px",
            borderRadius: showAvatar ? (message.analysisData ? "18px" : "4px 18px 18px 18px") : "18px 18px 18px 4px",
            background: "var(--bubble-bot-bg)",
            color: "var(--bubble-bot-text)",
            fontSize: 14, lineHeight: 1.7,
            whiteSpace: "pre-wrap", wordBreak: "break-word",
            boxShadow: "var(--bubble-bot-shadow)",
            border: message.analysisData ? "1px dashed rgba(0,0,0,0.1)" : "none",
          }}
        >
          {message.content}
        </div>
        <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4, paddingLeft: 1 }}>
          {message.time}
        </div>

        {/* 후보 종목 카드 */}
        {message.type === "candidates" && message.candidates && message.candidates.length > 0 && (
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
            {message.candidates.map((c, idx) => {
              const cur = fmtCurrency(c.ticker);
              return (
                <button
                  key={idx}
                  onClick={() => onSend?.(`${c.ticker} 분석해줘`)}
                  style={{
                    padding: "11px 14px", borderRadius: 16, background: "#fff",
                    border: "1.5px solid var(--border)", color: "var(--text-primary)",
                    fontSize: 13, textAlign: "left", cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 10,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                    transition: "all 0.2s ease", minHeight: 0,
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                  onMouseOut={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.transform = "none"; }}
                >
                  <span style={{ background: "var(--accent-light)", color: "var(--nav-active-color)", fontWeight: 700, fontSize: 11, padding: "3px 8px", borderRadius: 8 }}>{c.ticker}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</div>
                    {c.desc && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.desc}</div>}
                    {c.price != null && <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>{cur}{c.price.toLocaleString()} <ChangeText pct={c.changePct} /></div>}
                  </div>
                  <span style={{ fontSize: 11, color: "var(--accent)", fontWeight: 700 }}>분석 →</span>
                </button>
              );
            })}
          </div>
        )}

        {/* 추천 종목 카드 */}
        {message.type === "recommendation" && message.recData && (
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
            {message.recData.strongPicks && message.recData.strongPicks.length > 0 ? (
              message.recData.strongPicks.map((item, j) => (
                <button
                  key={`sp-${j}`}
                  onClick={() => onSend?.(`${item.ticker} 분석해줘`)}
                  style={{
                    padding: "12px 14px", borderRadius: 16,
                    background: "linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)",
                    border: "1.5px solid #a7f3d0", textAlign: "left", cursor: "pointer",
                    display: "flex", flexDirection: "column", gap: 5,
                    boxShadow: "0 1px 4px rgba(34,197,94,0.08)",
                    transition: "all 0.2s ease", minHeight: 0,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#059669", background: "#d1fae5", padding: "2px 8px", borderRadius: 6 }}>🟢 STRONG PICK</span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>{item.totalScore}/20</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                    <span style={{ fontWeight: 800, fontSize: 15 }}>{item.ticker}</span>
                    <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{item.name}</span>
                  </div>
                  {item.price != null && <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>${item.price.toLocaleString()} <ChangeText pct={item.changePct} /></div>}
                  {item.reason && <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5, background: "rgba(255,255,255,0.6)", borderRadius: 10, padding: "6px 10px", marginTop: 2 }}>{item.reason}</div>}
                </button>
              ))
            ) : (
              <div style={{ padding: "14px 16px", fontSize: 13, color: "var(--text-muted)", textAlign: "center", background: "#fafafa", borderRadius: 14, border: "1px dashed var(--border)" }}>
                엄격한 필터 기준을 통과한 추천 종목이 없습니다.
              </div>
            )}
            {message.recData.meta && (
              <div style={{ fontSize: 10, color: "var(--text-muted)", textAlign: "right", paddingRight: 4 }}>
                스캔: {message.recData.meta.scannedCount}종목 · {(message.recData.meta.elapsedMs / 1000).toFixed(1)}초
              </div>
            )}
          </div>
        )}

        {/* 예상 질문 버튼 */}
        {message.expectedQuestions && message.expectedQuestions.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6, paddingLeft: 2 }}>💡 이어서 물어보기</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {message.expectedQuestions.map((q, j) => (
                <button
                  key={j}
                  onClick={() => onSend?.(q)}
                  style={{
                    padding: "7px 14px", borderRadius: 20,
                    background: "var(--accent-light)", border: "1px solid #c8efd8",
                    color: "var(--nav-active-color)", fontSize: 12, fontWeight: 500,
                    cursor: "pointer", textAlign: "left",
                    transition: "all 0.15s ease",
                    whiteSpace: "nowrap", minHeight: 0,
                  }}
                  onMouseOver={e => { e.currentTarget.style.background = "#d4f5e0"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                  onMouseOut={e => { e.currentTarget.style.background = "var(--accent-light)"; e.currentTarget.style.transform = "none"; }}
                >{q}</button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
