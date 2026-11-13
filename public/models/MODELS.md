# 3D 모델 변환 결과

`npm run prepare-models` 가 자동 생성합니다. 출처·라이선스는 [CREDITS.md](../images/CREDITS.md) 참고.

| 작품 | 원본 파일 | 삼각형(전/후) | 용량(전/후) | 실제 높이 | 화면 크기(가로×높이×깊이) |
| --- | --- | --- | --- | --- | --- |
| 사모트라케의 니케 | victoire-de-samothrace-source.glb | 499,997 → **99,996** | 39.71 → **1.49 MB** | 3.28 m | 2.13 × 3.28 × 2.38 m |
| 밀로의 비너스 | venus-de-milo-source.glb | 122,482 → **99,987** | 8.39 → **1.58 MB** | 2.04 m | 0.65 × 2.04 × 0.62 m |

- 상한: 작품당 삼각형 100,000개 이하, 파일 5 MB 이하
- 압축: EXT_meshopt_compression (디코더가 three.js 에 포함되어 추가 파일이 필요 없음)
- 원본 파일은 `.cache/models/` 에 두며 저장소에는 포함하지 않습니다.
