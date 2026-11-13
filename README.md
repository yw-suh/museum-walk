# Museum Walk — 루브르에서 영감을 받은 가상 전시

유리 피라미드 앞뜰에서 출발해 **로비와 다섯 공간**을 아바타로 걸어 다니며,
실제로 루브르에 전시되어 있는 **회화 18점 + 조각 2점**을 공식 기록의 실제 크기 그대로 감상하는
1인칭/3인칭 교육용 가상 미술관입니다.

> **비상업적 교육 목적의 비공식 프로젝트이며, 루브르 박물관과는 무관합니다.**

| | |
| --- | --- |
| ![시작 화면](docs/screenshots/01-start.png) | ![외관](docs/screenshots/02-exterior.png) |
| ![입장 연출](docs/screenshots/03-transition.png) | ![다뤼 계단](docs/screenshots/04-daru-nike.png) |
| ![비너스 전시실](docs/screenshots/05-venus-room.png) | ![돌려 보기](docs/screenshots/06-orbit-viewer.png) |
| ![소개·출처](docs/screenshots/08-about.png) | ![정보 패널](docs/screenshots/06-info-panel.png) |

- **기술**: Three.js (r180) + Vite 7 — 서버 로직·환경 변수 없는 완전 정적 사이트
- **공간**: 바깥 앞뜰 → 로비 → 회화 전시실 3곳 + 조각 전시 공간 2곳
- **아바타**: 닉네임·색상을 고른 로우폴리 아바타. 3인칭이 기본이고 `V` 로 1인칭 전환
- **조각**: 공개 라이선스 3D 스캔을 웹용으로 감량(각 10만 삼각형 이하 · 1.5 MB 안팎)
- **네트워크**: 지금은 혼자 관람. `src/net/` 에 어댑터 자리만 있고 `?bots=3` 으로 확인 가능

---

## 빠르게 실행하기

```bash
npm install
npm run dev          # http://localhost:5173
```

닉네임과 아바타 색을 고르고 **입장하기** 를 누르면 **유리 피라미드 앞뜰**에서 관람이 시작됩니다.
피라미드 앞 문을 클릭하면 계단을 내려가는 짧은 연출 뒤 로비로 들어갑니다.

### 조작

| 데스크톱 | 동작 |
| --- | --- |
| `W` `A` `S` `D` / 방향키 | 걷기 |
| `Shift` | 빠르게 걷기 |
| 마우스 | 시점 회전 |
| 클릭 | 작품 정보 보기 · 문으로 입장 |
| `V` | 1인칭 / 3인칭 전환 |
| `M` | 공간 목록 |
| `E` | 바라보는 문으로 입장 |
| `Esc` | 열린 창 닫기 → 시작 화면 |

| 모바일 (터치 기기 자동 감지) | 동작 |
| --- | --- |
| 왼쪽 화면 드래그 | 가상 조이스틱으로 걷기 (끝까지 밀면 빠르게) |
| 오른쪽 화면 드래그 | 시점 회전 |
| 탭 | 작품 정보 보기 · 문으로 입장 |
| 우하단 **시점** 버튼 | 1인칭 / 3인칭 전환 |
| 상단 **공간** 버튼 | 공간 이동 |
| 상단 **소개·출처** 버튼 | 출처와 라이선스 전체 보기 |

모바일에서는 정보 패널이 **하단 시트**로 올라오고, 조준점 대신 **탭한 지점**으로 작품을 고릅니다.

### URL 파라미터

| 파라미터 | 뜻 |
| --- | --- |
| `?room=salle-des-etats` | 특정 공간으로 바로 입장 — `exterior` `lobby` `salle-des-etats` `peinture-francaise` `grande-galerie` `escalier-daru` `salle-venus` |
| `?bots=3` | 가짜 방문자 3명 생성 (최대 12) — 네트워크 자리 테스트용 |
| `?debug` | FPS · 드로우콜 · 삼각형 · 픽셀비 · 위치 표시 |

예) <code>?room=grande-galerie&bots=5&debug</code>

### 그 밖의 명령

```bash
npm run build            # dist/ 로 정적 빌드
npm run preview          # 빌드 결과 미리보기
npm run images           # fetch-images → optimize-images 를 연달아 실행
npm run prepare-models   # .cache/models 의 원본 GLB → public/models 감량본
npm run verify-links     # 외부 링크 80건이 모두 열리는지 확인
npm run audit-descriptions  # 설명문이 공식 기록 문장을 옮기지 않았는지 점검
```

---

## 공간 구성

| | 공간 | 실제 루브르 | 크기(가상) | 전시 |
| --- | --- | --- | --- | --- |
| 바깥 | 박물관 앞뜰 | Cour Napoléon (유리 피라미드) | 130 × 118 m | 입장 공간 |
| 로비 | 나폴레옹 홀 | Hall Napoléon (피라미드 아래) | 32 × 32 m | 문 6개 |
| 전시실 1 | 국가의 방 | 드농관 1층 **711호** Salle des États | 30 × 23 m | 회화 6점 |
| 전시실 2 | 프랑스 대형 회화실 | 드농관 1층 **700호 Mollien · 702호 Daru** | 34 × 18 m | 회화 6점 |
| 전시실 3 | 그랑드 갤러리 | 드농관 1층 **710호** Grande Galerie | 9.6 × **60 m** | 회화 6점 |
| 조각 1 | 다뤼 계단 | 드농관 1층 **703호** Palier Samothrace | 20 × 34 m | 조각 1점 |
| 조각 2 | 비너스 전시실 | 쉴리관 0층 **345호** | 17 × 21 m | 조각 1점 |

> **그랑드 갤러리는 일부 구간만 재현했습니다.** 실제 회랑은 길이 약 480 m 입니다.
> 이 가상 전시실은 선정 작품이 걸린 **1·2 travée 를 포함한 약 60 m 구간**만 재현한 것이며,
> 작품 순서도 실제 travée 순서(1 travée → 2 travée)를 따랐습니다.

---

## 전시 중인 작품 (18점)

18점 모두 **루브르 공식 소장품 데이터베이스의 JSON API**(`collections.louvre.fr/ark:/53355/<id>.json`)로
`room` 값을 직접 확인해 **"현재 전시 중 + 해당 전시실"** 임을 검증했습니다. 치수도 공식 기록값입니다.

### 전시실 1 — 국가의 방 (Salle 711)

| 작품 | 작가 | 제작 | 소장번호 | 전시실 | 실제 크기 |
| --- | --- | --- | --- | --- | --- |
| [모나리자](https://collections.louvre.fr/en/ark:/53355/cl010062370) | 레오나르도 다 빈치 | 1503~1519 | INV 779 ; MR 316 | Salle 711 | 79.4 × 53.4 cm |
| [가나의 혼인잔치](https://collections.louvre.fr/en/ark:/53355/cl010064382) | 파올로 베로네세 | 1562~1563 | INV 142 ; MR 384 | Salle 711 | 677 × 994 cm |
| [엠마오의 순례자](https://collections.louvre.fr/en/ark:/53355/cl010067589) | 파올로 베로네세 | 16세기 | INV 146 ; MR 385 | Salle 711 | 242 × 416 cm |
| [목욕하는 수산나](https://collections.louvre.fr/en/ark:/53355/cl010062254) | 틴토레토 | 1550~1575 | INV 568 ; MR 498 | Salle 711 | 167 × 238 cm |
| [장갑을 낀 남자](https://collections.louvre.fr/en/ark:/53355/cl010062290) | 티치아노 | 1500~1525 | INV 757 ; MR 507 | Salle 711 | 100 × 89 cm |
| [거울을 보는 여인](https://collections.louvre.fr/en/ark:/53355/cl010062292) | 티치아노 | 1525~1550 | INV 755 ; MR 504 | Salle 711 | 99 × 76 cm |

### 전시실 2 — 프랑스 대형 회화실 (Salle 700 Mollien · 702 Daru)

| 작품 | 작가 | 제작 | 소장번호 | 전시실 | 실제 크기 |
| --- | --- | --- | --- | --- | --- |
| [나폴레옹 1세의 대관식](https://collections.louvre.fr/en/ark:/53355/cl010065720) | 자크루이 다비드 | 1807 | INV 3699 ; MR 1437 | Salle 702 (Daru) | 621 × 979 cm |
| [메두사호의 뗏목](https://collections.louvre.fr/en/ark:/53355/cl010059199) | 테오도르 제리코 | 1818~1819 | INV 4884 ; C 51 | Salle 700 (Mollien) | 491 × 716 cm |
| [자파의 페스트 환자를 찾은 나폴레옹](https://collections.louvre.fr/en/ark:/53355/cl010062570) | 앙투안장 그로 | 1804 | INV 5064 ; MR 1782 | Salle 700 (Mollien) | 523 × 715 cm |
| [사르다나팔루스의 죽음](https://collections.louvre.fr/en/ark:/53355/cl010065757) | 외젠 들라크루아 | 1827 | RF 2346 | Salle 700 (Mollien) | 392 × 496 cm |
| [민중을 이끄는 자유의 여신](https://collections.louvre.fr/en/ark:/53355/cl010065872) | 외젠 들라크루아 | 1830 | RF 129 | Salle 700 (Mollien) | 260 × 325 cm |
| [사비니 여인들의 중재](https://collections.louvre.fr/en/ark:/53355/cl010065426) | 자크루이 다비드 | 1799 | INV 3691 ; L 3710 | Salle 702 (Daru) | 385 × 522 cm |

### 전시실 3 — 그랑드 갤러리 (Salle 710)

| 작품 | 작가 | 제작 | 소장번호 | 전시실 | 실제 크기 |
| --- | --- | --- | --- | --- | --- |
| [성 세바스티아누스](https://collections.louvre.fr/en/ark:/53355/cl010064796) | 안드레아 만테냐 | 1475~1500 | RF 1766 | Salle 710 (1ère travée) | 255 × 140 cm |
| [콘도티에레](https://collections.louvre.fr/en/ark:/53355/cl010065016) | 안토넬로 다 메시나 | 1475 | MI 693 | Salle 710 (1ère travée) | 36.2 × 30 cm |
| [암굴의 성모](https://collections.louvre.fr/en/ark:/53355/cl010062373) | 레오나르도 다 빈치 | 1483~1494 | INV 777 ; MR 320 | Salle 710 (2e travée) | 199.5 × 122 cm |
| [성 안나와 성 모자](https://collections.louvre.fr/en/ark:/53355/cl010066107) | 레오나르도 다 빈치 | 1503~1519 | INV 776 ; MR 319 | Salle 710 (2e travée) | 168 × 113 cm |
| [세례자 요한](https://collections.louvre.fr/en/ark:/53355/cl010062374) | 레오나르도 다 빈치 | 1508~1519 | INV 775 ; MR 318 | Salle 710 (2e travée) | 72.9 × 56.3 cm |
| [아름다운 정원사](https://collections.louvre.fr/en/ark:/53355/cl010060754) | 라파엘로 산치오 | 1507 | INV 602 ; MR 433 | Salle 710 (2e travée) | 122 × 80 cm |

### 후보였다가 제외한 작품

| 작품 | 제외 사유 (공식 기록 확인) |
| --- | --- |
| 티치아노 — 전원의 합주 (Le Concert champêtre) | **현재 비전시** (`non exposé`) |
| 베로네세 — 라 벨 나니 (La Belle Nani, RF 2111) | **루브르 아부다비** 소장 |
| 레오나르도 — 라 벨 페로니에르 (INV 778) | **현재 비전시** (`non exposé`) |
| 다비드 — 호라티우스 형제의 맹세 (RF 47) | 해당 ark 는 본작이 아니라 **밑그림**이며 `non exposé` |
| 카라바조 — 성모의 죽음 (INV 54) | 그랑드 갤러리이지만 **Salle 712**(3e travée) — 전시실 3 범위(710) 밖 |
| 라파엘로 — 발다사레 카스틸리오네 (INV 611) | **Salle 712**(Tribune) — 전시실 3 범위 밖 |
| 레오나르도 — 세례자 요한 (INV 780) | Salle 710 이지만 **17세기에 바쿠스로 개작된 다른 작품**. 대신 원작 INV 775 를 선정 |
| 제리코 — 메두사호의 뗏목 (RF 1667 / RF 2229) | 같은 제목이지만 **습작**이며 쉴리관 소장 |

---

## 전시 중인 조각 (2점)

둘 다 공식 JSON API 로 소장번호와 **현재 전시 위치**를 확인했습니다.

| 작품 | 소장번호 | 전시 위치 | 실제 크기 | 재질 |
| --- | --- | --- | --- | --- |
| [사모트라케의 니케](https://collections.louvre.fr/en/ark:/53355/cl010252531) | Ma 2369 | **Salle 703** Palier Samothrace (다뤼 계단 상단 동쪽 층계참) | 조각상 **328 cm** · 뱃머리 받침 포함 전체 564 cm | 파로스 대리석(상) · 라르토스 대리석(배·받침) |
| [밀로의 비너스](https://collections.louvre.fr/en/ark:/53355/cl010277627) | Ma 399 | **Salle 345** 쉴리관 0층 | **204 cm** | 파로스 대리석(리크니테스) |

### 3D 모델 출처 — 원본 스캔인지 복제본 스캔인지

| 작품 | 제공 | 라이선스 | 스캔 대상 | 삼각형(전/후) | 용량(전/후) |
| --- | --- | --- | --- | --- | --- |
| 사모트라케의 니케 | [Scan the World](https://zenodo.org/records/21354589) | CC BY-NC-SA 4.0 | **루브르에 전시된 원본 대리석**의 사진측량 스캔 | 499,997 → **99,996** | 39.71 → **1.49 MB** |
| 밀로의 비너스 | [Cosmo Wenman](https://zenodo.org/records/10331797) | CC BY 4.0 | **바젤 조각관의 석고 복제본** 스캔 (루브르 원본 아님) | 122,482 → **99,987** | 8.39 → **1.58 MB** |

두 사실 모두 정보 패널 하단과 "소개·출처" 화면에 그대로 적어 두었습니다.
니케 모델은 **CC BY-NC-SA** 이므로, 이 저장소의 `public/models/victoire-de-samothrace.glb`
(감량본 = 2차적 저작물)도 같은 조건을 따릅니다. 코드 라이선스와 별개입니다.

변환 과정과 수치는 [`public/models/MODELS.md`](public/models/MODELS.md) 에 자동 기록됩니다.

### 조각 상호작용

- 클릭/탭 → 회화와 같은 정보 패널 (제목·작가·연대·재질·크기·설명·링크·출처)
- 패널의 **"돌려 보기"** → 전체 화면에서 조각만 따로. 드래그 회전 · 휠/핀치 확대 · `Esc` 로 닫기
- 모델은 **그 공간에 들어갈 때만** 내려받고, 나가면 해제합니다

---

## 외부 링크

작품마다 **루브르 공식 소장품 페이지**와 **위키백과**를 연결합니다.
한국어 개별 문서가 없는 작품은 한국어 **작가 문서**를 유지하고 **영문 작품 문서**를 덧붙였습니다.
조각은 여기에 더해 **3D 모델 출처와 라이선스 링크**까지 연결합니다.
모든 링크는 `target="_blank" rel="noopener noreferrer"` 이며, `npm run verify-links` 로 **80건 전부 HTTP 200** 을 확인합니다.

---

## 이미지 파이프라인

```
Wikimedia Commons (퍼블릭 도메인)
   │ npm run fetch-images     긴 변 ≤ 4096px JPEG · 이어받기 지원
   ▼
.cache/originals/*.jpg        (git 에 올리지 않음 · 합계 86 MB)
   │ npm run optimize-images  sharp
   ├─▶ public/images/<id>.webp        3D 텍스처 · 긴 변 2048px · q80
   └─▶ public/images/large/<id>.webp  크게 보기 뷰어 · 긴 변 ≤ 4096px · q82 · 지연 로딩
```

**텍스처 용량 상한은 전시실 단위 4 MB** 입니다. 전시실은 한 번에 하나만 로딩하므로
입장할 때 받는 양이 곧 한 방의 합계입니다. 넘으면 `optimize-images` 가 실패로 끝납니다.

| 전시실 | 작품 | 텍스처 합계 | 뷰어 합계(지연 로딩) |
| --- | ---: | ---: | ---: |
| salle-des-etats | 6 | **3.57 MB** | 16.10 MB |
| peinture-francaise | 6 | **2.49 MB** | 10.56 MB |
| grande-galerie | 6 | **1.59 MB** | 9.62 MB |

자세한 표는 [`public/images/SIZES.md`](public/images/SIZES.md), 출처·라이선스는
[`public/images/CREDITS.md`](public/images/CREDITS.md) 에 자동 기록됩니다.

---

## 폴더 구조

```
.
├─ index.html                  시작 화면 · HUD · 위치 막대 · 패널 · 뷰어 · 메뉴 · 터치 레이어
├─ vite.config.js / vercel.json
├─ docs/screenshots/
├─ public/images/              <id>.webp · large/<id>.webp · CREDITS.md · SIZES.md
├─ scripts/                    fetch-images · optimize-images · verify-links
└─ src/
   ├─ main.js                  오케스트레이터 — 상태·입력·UI·네트워크를 연결하는 유일한 지점
   ├─ style.css
   ├─ core/                    ── 상태 계층 (3D 와 무관) ──
   │  ├─ PlayerState.js        { id, name, color, roomId, position, rotation, moving }
   │  ├─ profile.js            닉네임·색상 localStorage
   │  ├─ router.js             ?room= / ?bots= / ?debug  URL 동기화
   │  └─ input.js              키보드 + 터치를 하나의 입력원으로
   ├─ data/                    ── 콘텐츠 계층 ──
   │  ├─ rooms.json            공간 치수 · 벽 · 집기 · 포털 · 조명 · 걸이/감상 규칙
   │  ├─ paintings.json        작품 메타 · 치수 · 배치 · 크기 비교 · 링크 · 출처
   │  └─ catalog.js            데이터 접근 계층 (씬·UI 는 JSON 을 직접 읽지 않는다)
   ├─ scene/                   ── 3D 계층 ──
   │  ├─ createScene.js        렌더러 · 카메라 · 성능 가드
   │  ├─ buildRoom.js          rooms.json → 바닥/천장/벽/집기/포털 + 충돌 AABB
   │  ├─ buildPaintings.js     paintings.json → 캔버스 + 액자 + 스포트 + 감상 위치 표시
   │  ├─ RoomSession.js        공간 하나를 올리고 내리는 단위 (텍스처 dispose)
   │  ├─ Avatar.js             로우폴리 아바타 — 내 것과 원격이 공유
   │  └─ PlayerController.js   이동 · 충돌 · 1인칭/3인칭 카메라
   ├─ interaction/
   │  └─ picker.js             작품 + 포털 Raycaster 판정 (중앙 / 탭 좌표)
   ├─ net/                     ── 네트워크 계층 (Phase 3 자리) ──
   │  ├─ NetworkAdapter.js     인터페이스 + 아무것도 안 하는 LocalAdapter
   │  ├─ BotAdapter.js         ?bots=N 가짜 방문자
   │  └─ RemoteAvatar.js       원격 아바타 + 보간 + 입·퇴장 관리
   └─ ui/                      ── UI 계층 ──
      ├─ startOverlay.js  infoPanel.js  imageViewer.js
      ├─ hud.js  roomMenu.js  touchControls.js  debugOverlay.js
```

### Phase 3(실시간 다중 접속)에 꽂을 자리

1. **플레이어 상태는 한 객체** — `core/PlayerState.js` 의 `{ id, name, color, roomId, position, rotation, moving }`.
   `toSnapshot()` / `applySnapshot()` 이 그대로 전송 형식입니다.
2. **네트워크는 어댑터 하나** — `net/NetworkAdapter.js` 의 네 메서드
   (`connect` / `sendState` / `onPlayersUpdate` / `disconnect`)만 구현하면 됩니다.
   `main.js` 에서 바꾸는 줄은 **한 줄**입니다:

   ```js
   const net = route.bots > 0 ? new BotAdapter(route.bots) : new LocalAdapter();
   //                                                     ↑ 여기를 실시간 구현으로
   ```

3. **아바타 렌더링은 공용** — 내 아바타(`PlayerController.avatar`)와 원격 아바타(`RemoteAvatar.avatar`)가
   **같은 `Avatar` 클래스**를 씁니다. 검증 스크립트에서 두 인스턴스의 생성자가 같은지 확인합니다.
4. **전송 주기도 이미 분리** — `main.js` 의 `NET_SEND_INTERVAL`(초당 12회)에 맞춰
   `net.sendState(player.toSnapshot())` 를 이미 호출하고 있습니다. LocalAdapter 가 버릴 뿐입니다.
5. **원격 아바타 보간·입퇴장** — `RemoteAvatarGroup.sync(players, roomId)` 가
   같은 방에 있는 사람만 씬에 올리고, 사라진 사람은 해제합니다.
6. **가짜 방문자로 미리 확인** — `?bots=3` 은 실제 어댑터와 **똑같은 인터페이스**로 동작하므로,
   실시간 구현을 끼워도 화면 코드는 그대로입니다.

---

## 작품·전시실 추가하기

### 작품 추가

1. **소재 확인** — 공식 JSON API 로 `room` 과 `dimension` 을 직접 확인합니다.

   ```bash
   curl -s "https://collections.louvre.fr/ark:/53355/<ark-id>.json" \
     | node -e "const d=JSON.parse(require('fs').readFileSync(0));console.log(d.title,'|',d.room,'|',JSON.stringify(d.dimension))"
   ```

   `room` 이 비어 있고 `currentLocation` 이 `non exposé` 면 **현재 비전시**이므로 넣지 않습니다.

2. **이미지** — `scripts/fetch-images.mjs` 의 `TARGETS` 에 `{ id, commonsFile }` 한 줄을 더하고 `npm run images`.
3. **데이터** — `src/data/paintings.json` 에 항목 추가. `room` 에 전시실 id, `louvreRoom` 에 실제 전시실 번호를 적습니다.
4. **확인** — `npm run verify-links` 와 `npm run dev`.

`placement` 읽는 법은 아래와 같습니다. 걸이 높이와 감상 위치는 적지 않으면 규칙대로 자동 계산됩니다.

| 키 | 의미 |
| --- | --- |
| `wall` | 걸 벽의 `id` |
| `face` | `axis:"x"` 벽은 `+`가 +Z쪽, `axis:"z"` 벽은 `+`가 +X쪽 |
| `offset` | 벽 중앙에서 벽이 뻗은 축을 따라 이동한 거리(m) |
| `centerHeight` | *(선택)* 걸이 높이 직접 지정 |
| `viewFrom` | *(선택)* 감상 위치까지의 거리(m) |

**걸이 규칙** — 세로 **150 cm 초과** 대형 작품은 **하단을 바닥에서 0.8 m**, 그 외는 **중심을 1.6 m**.

### 전시실 추가

`src/data/rooms.json` 의 `rooms` 에 공간을 더하고, 로비의 `portals` 에 한 줄을 추가하면 끝입니다.
전시실 목록 메뉴와 `?room=` 라우팅은 `catalog.listRooms()` 를 쓰므로 자동으로 반영됩니다.

---

## 결정 사항

판단이 필요했던 부분과 그 근거입니다.

### 1. 전시실 2 는 실제로 두 방(700·702)을 합친 것

요청하신 세 작품(「메두사호의 뗏목」·「민중을 이끄는 자유의 여신」·「나폴레옹 대관식」)은 공식 기록상
**같은 방에 있지 않습니다.** 앞의 둘은 **700호 Mollien(낭만주의)**, 대관식은 **702호 Daru(신고전주의)** 입니다.
두 방은 드농관 1층에 나란히 붙은 대형 프랑스 회화 전시실이므로, **하나의 가상 전시실로 합치고**
각 작품의 정보 패널과 README 표에 **실제 전시실 번호를 그대로 표기**했습니다.
전시실 소개문에도 합쳤다는 사실을 적어 두었습니다.

### 2. 「세례자 요한」은 INV 775 로 교체

검색으로 먼저 찾은 INV 780 은 Salle 710 에 있지만, 공식 기록의 비고가
`transformé en Bacchus au XVIIe siècle`(17세기에 바쿠스로 개작)이고 치수도 177 × 115 cm 로
널리 알려진 「세례자 요한」(72.9 × 56.3 cm)과 다릅니다. **서로 다른 작품**이므로,
같은 Salle 710 에 있는 원작 **INV 775** 로 교체했습니다.

### 3. 「성 안나와 성 모자」의 치수 표기

루브르 공식 기록은 **168 × 113 cm** 입니다. 다만 널리 인용되는 치수(168 × 130 cm)나
Commons 이미지의 가로세로 비율과는 약 10% 차이가 있습니다.
본 프로젝트의 기준은 **공식 기록**이므로 113 cm 로 걸되, 이미지가 눌려 보일 수 있습니다.
개발 모드에서 이미지 비율이 공식 치수와 8% 넘게 다르면 콘솔에 경고를 띄우도록 해 두었습니다(`buildPaintings.js`).

### 4. 그랑드 갤러리는 60 m 구간만

실제 회랑은 약 480 m 입니다. 전부 재현하면 걸어서 건너는 데만 몇 분이 걸리고
빈 벽이 대부분이어서, **선정 작품이 있는 1·2 travée 중심 60 m 구간**만 재현했습니다.
작품을 travée 순서대로 배치해 실제 동선의 느낌은 남겼습니다.

### 5. 로비는 "영감을 받은" 공간

나폴레옹 홀의 실제 도면을 재현하지 않고, **유리 피라미드 천창 · 원형 바닥 문양 · 세 방향의 문**
이라는 특징만 추려 32 × 32 m 정사각 홀로 단순화했습니다. 로비는 작품이 없는 길목이므로
정확도보다 **어디로 가야 하는지 한눈에 보이는 것**을 우선했습니다.

### 6. 포털은 "클릭/탭"으로 입장

문 가까이 가면 자동으로 넘어가게 하면, 벽을 따라 걷다가 의도치 않게 이동하는 일이 생깁니다.
**바라보면 안내가 뜨고, 클릭(또는 `E`, 모바일은 탭)해야 이동**하도록 했습니다.

### 7. 방을 옮길 때 이전 방을 "나중에" 해제

새 방을 먼저 다 만든 뒤 이전 방을 `dispose()` 합니다. 반대로 하면 로딩 중 화면이 비기 때문입니다.
메모리는 잠깐 두 방 분량이 되지만, 전시실 하나가 2~4 MB 라서 문제가 되지 않습니다.
검증 스크립트에서 **세 방을 세 바퀴 돈 뒤 텍스처·지오메트리 수가 그대로인지** 확인합니다(증가 0).

### 8. 3인칭 카메라는 아바타를 "쳐다보지" 않는다

처음에는 카메라가 아바타를 바라보도록(`lookAt(player)`) 만들었는데, 그러면 **화면 한가운데 조준점이
아바타의 몸통을 가리켜** 작품을 조준할 수 없었습니다(검증에서 Raycaster 적중 0건).
지금은 카메라를 시선 축 위 뒤쪽에 두고 **회전은 1인칭과 똑같이 `(pitch, yaw)`** 로 둡니다.
덕분에 조준점이 1인칭·3인칭에서 동일하게 "바라보는 곳"을 가리키고, 아바타는 화면 아래쪽에 보입니다.

벽에 파묻히는 문제는 몸에서 카메라 자리까지 광선을 쏘아 막히면 그만큼 앞으로 당겨(최소 0.9 m) 해결합니다.

### 9. 작품을 고르면 카메라가 정면으로 이동

작품을 비스듬히 보면서 설명을 읽으면 그림이 찌그러져 보입니다.
선택하는 순간 **그 작품의 감상 위치로 이동해 정면을 보도록** 했습니다.
3인칭에서는 카메라 위치가 `pitch` 에 따라 달라지므로 두 번 반복해 수렴시킵니다.
(검증: 카메라 시선과 작품 방향의 내적 **1.000**)

### 10. 폰트는 CDN(Pretendard 동적 서브셋)

한글 웹폰트를 자체 호스팅하면 저장소에 수 MB 가 추가됩니다. jsDelivr 의 동적 서브셋 CSS 를 쓰고,
받지 못하는 환경에서는 `Noto Sans KR` → 시스템 한글 폰트로 떨어지도록 CSS 스택을 구성했습니다.
아바타 이름표와 포털 안내판도 같은 폰트를 캔버스에 그립니다.

### 11. 성능

그림자 비활성화, 후처리 없음, 작품 캔버스는 조명 계산이 없는 `MeshBasicMaterial`.
`?bots=3` 을 켠 국가의 방 기준 **드로우콜 98 · 삼각형 6,808 · 광원 9** 로 가볍습니다.
여기에 더해 2초마다 프레임레이트를 보고 55fps 미만이면 픽셀 비율을 2 → 1.5 → 1 로 낮춥니다.

> 검증은 헤드리스 Chrome + 소프트웨어 렌더러(SwiftShader)에서 했으므로
> **실제 GPU 의 프레임레이트를 측정한 값이 아닙니다.** 실측은 `?debug` 로 확인하세요.

### 12. 배포는 직접 하시도록 남겨 두었습니다

`vercel` 명령은 실행하지 않았습니다. 설정은 모두 준비되어 있으니 위의 "배포(Vercel)" 절차를 따르면 됩니다.

### 13. 외관은 "영감을 받은" 공간이지 재현이 아닙니다

유리 피라미드만 실제 비율(밑변 35 m · 높이 21.6 m)을 지켰고,
ㄷ자 궁전은 **석조 매스 + 창·기둥 반복 패턴**으로 단순화했습니다.
사진 수준의 재현을 목표로 하면 저작권·상표 문제와 용량이 모두 커지는 데 비해
"어디에 서 있는지 알아보게 하는" 목적에는 보탬이 적다고 판단했습니다.
외벽·바닥·하늘 텍스처는 **외부 이미지를 쓰지 않고 전부 코드로 생성**했고, 로고·상표는 넣지 않았습니다.

### 14. 니케 모델은 CC BY-NC-SA 를 받아들였습니다

요청하신 Cosmo Wenman 의 니케 스캔은 Thingiverse/Sketchfab 에만 있어 로그인 없이 받을 수 없었습니다.
공개 API 로 받을 수 있는 대안 중 **Scan the World 의 루브르 원본 대리석 스캔**(CC BY-NC-SA 4.0)을 골랐습니다.
이 프로젝트가 비상업적이라 조건에 맞고, 무엇보다 **석고 복제본이 아니라 원본을 스캔한 것**이라
교육용으로 더 정확합니다. 대신 감량본도 같은 라이선스를 따른다는 점을 README·패널·소개 화면에 명시했습니다.

비너스는 Cosmo Wenman 의 **CC BY 4.0** 스캔을 그대로 썼습니다. 다만 이쪽은 바젤 조각관의
**석고 복제본** 스캔이므로, 그 사실도 똑같이 적어 두었습니다.

### 15. 니케 높이는 "조각상 328 cm" 를 썼습니다

공식 기록에는 높이가 여러 개 적혀 있습니다 — 564 cm(뱃머리 받침까지 포함한 기념물 전체),
328 cm(조각상), 200 cm, 36 cm. 3D 모델이 **조각상만** 담고 있으므로 328 cm 로 세우고,
전체 564 cm 라는 사실은 패널의 크기 설명에 적었습니다.

### 16. 계단을 위해 바닥 높이 개념을 넣었습니다

다뤼 계단은 "계단 위의 니케"가 핵심이라 평평한 바닥으로는 재현할 수 없었습니다.
`rooms.json` 의 `ground`(platform/ramp)로 (x, z) → 높이를 정의하고,
이동·충돌·카메라가 모두 발밑 높이를 따릅니다. 충돌은 **발밑보다 25 cm 넘게 솟은 것**만 막으므로
계단을 오르다 막히지 않습니다. 피라미드 입구 단도 같은 장치를 씁니다.

### 17. 조각은 "크게 보기" 대신 "돌려 보기"

회화는 평면이라 고해상도 이미지를 확대하면 충분하지만, 조각은 각도가 곧 정보입니다.
전시실 씬과 분리된 작은 씬에 OrbitControls 를 붙여 회전·확대만 할 수 있게 했고,
닫으면 렌더 루프와 지오메트리·재질을 모두 해제합니다.

전시실 안에서도 조각을 클릭하면 **보던 방향을 유지한 채 거리만 맞춥니다.**
회화처럼 정면으로 끌어다 놓으면 애써 돌아본 각도가 사라지기 때문입니다.

### 18. 「성 안나와 성 모자」는 늘이지 않고 잘랐습니다

공식 치수(168 × 113 cm)와 Commons 스캔의 비율이 약 10% 달라, 늘이면 그림이 찌그러집니다.
`optimize-images` 가 **가운데를 기준으로 가로를 잘라** 공식 비율에 맞춥니다(3840×5149 → 3463×5149).
가장자리를 조금 잃지만 비율은 정확해지고, 개발 모드의 비율 경고도 사라집니다.
같은 처리가 필요한 작품이 생기면 `CROP_TO_OFFICIAL` 에 id 만 추가하면 됩니다.

### 19. 설명문 점검은 자동화했습니다

`npm run audit-descriptions` 가 공식 ark 레코드의 모든 텍스트를 모아
우리 설명문과 가장 긴 공통 구간을 찾습니다. **연도·치수 같은 숫자는 사실 정보라 넘기고,
글자가 4자 이상 이어진 구간만** 문제로 봅니다. 20건 모두 통과했고,
걸린 것은 " 1671", " 1820" 같은 연도뿐이었습니다.
설명문은 전부 한국어로 새로 썼으며, 공식 사이트의 프랑스어 문장을 옮긴 부분은 없습니다.

### 20. ?bots·?debug 는 공개 버전에도 남깁니다

지우면 실제 기기에서 성능을 확인할 방법이 없어집니다. 대신 **화면 어디에도 안내하지 않고**
README 에만 적어 두었습니다. 둘 다 데이터를 바꾸지 않는 읽기 전용 기능입니다.

---

## 배포 (Vercel)

`vercel.json` 에 프레임워크·빌드 명령·출력 폴더와 캐시 헤더가 들어 있어 추가 설정이 필요 없습니다.
**서버 로직도 환경 변수도 없는 완전 정적 사이트**입니다.

### 배포 전 확인할 것

`src/config.js` 한 파일만 보면 됩니다.

| 항목 | 지금 값 | 설명 |
| --- | --- | --- |
| `SITE.NAME` | `Museum Walk` | 탭 제목·시작 화면·공유 미리보기에 쓰입니다 |
| `SITE.TAGLINE` | `루브르에서 영감을 받은 가상 전시` | 제목 뒤에 붙습니다 |
| `SITE.CREDIT_NAME` | **(빈칸)** | 제작자 이름. 비워 두면 "소개·출처"에 표시되지 않습니다 |
| `SITE.FEEDBACK_URL` | **(빈칸)** | 의견 보내기 링크. 비워 두면 버튼 자체가 숨겨집니다 |
| `SITE.SHOW_BETA` | `true` | 화면 구석 "Beta" 표시. 정식 공개 때 `false` 로 |
| `SITE.DISCLAIMER` | 비공식 안내 문구 | 시작 화면과 화면 하단에 고정 표시됩니다 |

### 방법 1 — Vercel 웹 화면

1. 저장소를 GitHub/GitLab/Bitbucket 에 올립니다.
2. [vercel.com/new](https://vercel.com/new) → **Import Git Repository** 에서 저장소를 고릅니다.
3. 설정은 건드리지 않아도 됩니다. `vercel.json` 때문에 자동으로 잡힙니다.
   (Framework: Vite · Build: `npm run build` · Output: `dist`)
4. **Deploy** 를 누르면 끝입니다. 이후 푸시할 때마다 자동 배포됩니다.

### 방법 2 — CLI

```bash
npm i -g vercel
vercel          # 미리보기 배포 (처음 실행하면 프로젝트 연결을 물어봅니다)
vercel --prod   # 프로덕션 배포
```

### 배포 뒤 확인

- 공유 미리보기(`/share-preview.png`)가 보이는지 — 카카오톡·슬랙에 링크를 붙여 확인
- `?debug` 를 붙여 실제 기기에서 FPS 확인 (공개 화면에는 안내하지 않습니다)
- 조각 공간에서 GLB 가 `model/gltf-binary` 로 내려오는지 (`vercel.json` 에 지정해 두었습니다)

---

## 라이선스

**코드**는 자유롭게 사용하셔도 됩니다.

**작품 이미지** 18점은 모두 Wikimedia Commons 의 퍼블릭 도메인 파일입니다 —
[`public/images/CREDITS.md`](public/images/CREDITS.md).

**3D 모델**은 파일마다 조건이 다릅니다.

| 파일 | 라이선스 | 표기 |
| --- | --- | --- |
| `public/models/venus-de-milo.glb` | CC BY 4.0 | Cosmo Wenman |
| `public/models/victoire-de-samothrace.glb` | **CC BY-NC-SA 4.0** | Scan the World |

니케 모델은 비상업적 이용과 동일조건 변경허락이 조건입니다. 이 저장소의 감량본도
같은 조건을 따르며, 상업적으로 쓰려면 다른 모델로 교체해야 합니다.

**작품 정보·치수·전시실 위치**는 루브르 박물관 공식 소장품 데이터베이스
(collections.louvre.fr)에서 확인했습니다. 설명문은 모두 한국어로 새로 쓴 것입니다.

이 프로젝트는 **루브르 박물관과 아무런 관계가 없는 비공식·비상업 프로젝트**입니다.
