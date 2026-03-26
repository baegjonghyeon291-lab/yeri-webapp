/**
 * risk-level.ts — 앱 전역 위험도 판정 공통 유틸
 * 브리핑, 포트폴리오, 관심종목, 채팅 결과 등에서 동일 기준 사용
 */

export type RiskLevel = 'HIGH' | 'MEDIUM' | 'INFO';

interface RiskStyle {
  bg: string;
  border: string;
  color: string;
  icon: string;
  label: string;
}

const RISK_STYLES: Record<RiskLevel, RiskStyle> = {
  HIGH: {
    bg: 'var(--status-high-bg, #fff5f5)',
    border: 'var(--status-high-text, #dc2626)',
    color: 'var(--status-high-text, #dc2626)',
    icon: '🔴',
    label: 'HIGH',
  },
  MEDIUM: {
    bg: 'var(--status-medium-bg, #fffbeb)',
    border: 'var(--status-medium-text, #d97706)',
    color: 'var(--status-medium-text, #d97706)',
    icon: '🟡',
    label: 'MEDIUM',
  },
  INFO: {
    bg: 'var(--status-info-bg, #f0fdf4)',
    border: 'var(--status-info-text, #16a34a)',
    color: 'var(--status-info-text, #16a34a)',
    icon: '⚪',
    label: 'INFO',
  },
};

const HIGH_KEYWORDS = [
  '⚠️', '위험', 'HIGH', '급락', '과열', '과매수', '폭락', '손실 확대',
  '변동성 과도', '집중도 과도', '악재', '매도 신호', '리스크 높',
];
const MEDIUM_KEYWORDS = [
  '👉', '주의', 'MEDIUM', '관망', '혼조', '불확실', '변동성',
  '조정', '중립', '약보합', '주의 필요',
];
const INFO_KEYWORDS = [
  '💡', '참고', 'INFO', '안정', '양호', '긍정', '상승',
  '매수 적기', '개선', '호재',
];

/**
 * 텍스트 기반 위험도 판정
 * HIGH 키워드가 있으면 HIGH, MEDIUM 키워드면 MEDIUM, 그 외 INFO
 */
export function getRiskLevel(text: string): RiskLevel {
  const t = text || '';
  if (HIGH_KEYWORDS.some(k => t.includes(k))) return 'HIGH';
  if (MEDIUM_KEYWORDS.some(k => t.includes(k))) return 'MEDIUM';
  return 'INFO';
}

/**
 * 수익률 기반 위험도 판정 (포트폴리오용)
 * -10% 이하: HIGH, -10%~0%: MEDIUM, 0% 이상: INFO
 */
export function getRiskLevelByPnl(pnlPct: number): RiskLevel {
  if (pnlPct <= -10) return 'HIGH';
  if (pnlPct < 0) return 'MEDIUM';
  return 'INFO';
}

/**
 * 위험도에 대응하는 스타일 객체 반환
 */
export function getRiskStyle(level: RiskLevel): RiskStyle {
  return RISK_STYLES[level];
}

/**
 * 위험도 CSS 클래스명 반환 (globals.css의 .status-high 등과 매핑)
 */
export function getRiskClassName(level: RiskLevel): string {
  return `status-${level.toLowerCase()}`;
}
