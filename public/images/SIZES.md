# 이미지 변환 결과

`npm run optimize-images` 가 자동 생성합니다. 출처·라이선스는 [CREDITS.md](CREDITS.md) 참고.

## 전시실별 3D 텍스처 용량 (상한 4 MB / 전시실)

전시실은 한 번에 하나만 로딩하므로, 입장할 때 내려받는 양이 곧 한 방의 합계입니다.

| 전시실 | 작품 수 | 텍스처 합계 | 뷰어 합계(지연 로딩) |
| --- | ---: | ---: | ---: |
| salle-des-etats | 6 | **3.57 MB** | 16.10 MB |
| grande-galerie | 6 | **1.53 MB** | 9.18 MB |
| peinture-francaise | 6 | **2.49 MB** | 10.56 MB |

## 작품별

| 작품 | 전시실 | 원본 | 텍스처 WebP (2048) | 뷰어 WebP (4096) |
| --- | --- | --- | --- | --- |
| femme-au-miroir | salle-des-etats | 3840x4764 | 1651x2048 · 500 KB | 3302x4096 · 3734 KB |
| homme-au-gant | salle-des-etats | 2517x2824 | 1825x2048 · 545 KB | 2517x2824 · 1108 KB |
| la-belle-jardiniere | grande-galerie | 3840x5972 | 1317x2048 · 295 KB | 2634x4096 · 1432 KB |
| le-condottiere | grande-galerie | 3840x4304 | 1827x2048 · 124 KB | 3654x4096 · 767 KB |
| les-sabines | peinture-francaise | 3840x2887 | 2048x1540 · 431 KB | 3840x2887 · 1561 KB |
| liberte-guidant-le-peuple | peinture-francaise | 3840x3072 | 2048x1638 · 340 KB | 3840x3072 · 1797 KB |
| mona-lisa | salle-des-etats | 3840x5723 | 1374x2048 · 752 KB | 2748x4096 · 3819 KB |
| mort-de-sardanapale | peinture-francaise | 3840x3005 | 2048x1603 · 378 KB | 3840x3005 · 1693 KB |
| noces-de-cana | salle-des-etats | 3840x2571 | 2048x1371 · 503 KB | 3840x2571 · 2332 KB |
| pelerins-emmaus | salle-des-etats | 3840x2205 | 2048x1176 · 473 KB | 3840x2205 · 2110 KB |
| pestiferes-de-jaffa | peinture-francaise | 4018x2909 | 2048x1483 · 224 KB | 4018x2909 · 762 KB |
| radeau-de-la-meduse | peinture-francaise | 3840x2621 | 2048x1398 · 634 KB | 3840x2621 · 3090 KB |
| sacre-de-napoleon | peinture-francaise | 3840x2415 | 2048x1288 · 546 KB | 3840x2415 · 1909 KB |
| saint-jean-baptiste | grande-galerie | 3840x4971 | 1582x2048 · 245 KB | 3164x4096 · 1996 KB |
| saint-sebastien | grande-galerie | 3454x6425 | 1101x2048 · 195 KB | 2202x4096 · 867 KB |
| sainte-anne | grande-galerie | 3840x5149 | 1377x2048 · 381 KB | 2755x4096 · 2554 KB |
| suzanne-au-bain | salle-des-etats | 3840x2635 | 2048x1405 · 882 KB | 3840x2635 · 3385 KB |
| vierge-aux-rochers | grande-galerie | 3460x5487 | 1291x2048 · 331 KB | 2583x4096 · 1783 KB |

- 원본 JPEG 합계: 86.01 MB (저장소에 포함하지 않음)
- 전체 텍스처: 7.59 MB · 전체 뷰어: 35.84 MB
