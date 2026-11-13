/**
 * 사이트 설정 — 공개 전에 여기만 고치면 됩니다.
 *
 * CREDIT_NAME 과 FEEDBACK_URL 은 비워 두면 화면에 아예 나타나지 않습니다.
 */
export const SITE = {
  /** 사이트 이름 (브라우저 탭·시작 화면·공유 미리보기) */
  NAME: 'Museum Walk',
  TAGLINE: '루브르에서 영감을 받은 가상 전시',

  /** 공유 미리보기에 쓰는 설명 */
  DESCRIPTION:
    '루브르 박물관에서 영감을 받은 교육용 가상 전시입니다. 유리 피라미드 앞에서 출발해 전시실을 걸어 다니며 회화 18점과 조각 2점을 실제 크기로 감상합니다.',

  /** 모든 화면에 들어가는 비공식 안내 — 지우지 마세요 */
  DISCLAIMER: '비상업적 교육 목적의 비공식 프로젝트이며, 루브르 박물관과는 무관합니다.',

  /** 제작자 이름. 비워 두면 "소개·출처" 화면에서 숨겨집니다. */
  CREDIT_NAME: 'ywsuh',

  /**
   * 의견 보내기 링크(구글 폼·이메일·이슈 등). 비워 두면 버튼이 숨겨집니다.
   * 예) 'https://forms.gle/xxxxxxxx' 또는 'mailto:you@example.com'
   */
  FEEDBACK_URL: '',

  /** 화면 구석 "Beta" 표시 */
  SHOW_BETA: true,
};

/** 브라우저 탭·공유에 쓰는 전체 제목 */
export const FULL_TITLE = `${SITE.NAME} — ${SITE.TAGLINE}`;

/** 소개 화면에 적는 라이브러리·폰트 라이선스 */
export const DEPENDENCIES = [
  { name: 'three.js', version: 'r180', license: 'MIT', url: 'https://github.com/mrdoob/three.js' },
  { name: 'Vite', version: '7', license: 'MIT', url: 'https://github.com/vitejs/vite' },
  { name: 'Pretendard', version: '1.3.9', license: 'SIL Open Font License 1.1', url: 'https://github.com/orioncactus/pretendard' },
  { name: 'meshoptimizer', version: '1.3', license: 'MIT', url: 'https://github.com/zeux/meshoptimizer' },
  { name: 'glTF Transform', version: '4.5', license: 'MIT', url: 'https://github.com/donmccurdy/glTF-Transform' },
  { name: 'sharp', version: '0.34', license: 'Apache-2.0', url: 'https://github.com/lovell/sharp' },
];
