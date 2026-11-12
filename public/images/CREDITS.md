# 이미지 출처 및 라이선스

`public/images/` 의 모든 작품 이미지는 Wikimedia Commons의 **퍼블릭 도메인** 파일에서 변환한 것입니다.
원작은 모두 저작권 보호기간이 만료된 16세기 회화입니다.

파이프라인: `npm run fetch-images` 가 Commons에서 긴 변 4096px 이하 원본을 `.cache/originals/` 로 받고,
`npm run optimize-images` 가 이를 WebP 두 벌로 변환합니다.

| 용도 | 경로 | 긴 변 | 품질 |
| --- | --- | --- | --- |
| 3D 텍스처 | `public/images/<id>.webp` | 2048px | 80 |
| 크게 보기 뷰어 (지연 로딩) | `public/images/large/<id>.webp` | 4096px | 82 |

아래 해상도는 Commons에서 받은 원본 기준입니다.

## mona-lisa

- **Commons 파일**: [Mona Lisa, by Leonardo da Vinci, from C2RMF retouched.jpg](https://commons.wikimedia.org/wiki/File%3AMona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg)
- **Commons `Artist` 필드**: Leonardo da Vinci
- **라이선스**: Public domain
- **내려받은 해상도**: 2748x4095 (Commons 원본 7479x11146) · 9012 KB

## noces-de-cana

- **Commons 파일**: [Les Noces de Cana - Paolo Veronese - Musée du Louvre Peintures INV 142 ; MR 384.jpg](https://commons.wikimedia.org/wiki/File%3ALes_Noces_de_Cana_-_Paolo_Veronese_-_Mus%C3%A9e_du_Louvre_Peintures_INV_142_%3B_MR_384.jpg)
- **Commons `Artist` 필드**: Paolo Veronese
- **라이선스**: Public domain
- **내려받은 해상도**: 4096x2743 (Commons 원본 10068x6742) · 3021 KB

## homme-au-gant

- **Commons 파일**: [Tizian 079.jpg](https://commons.wikimedia.org/wiki/File%3ATizian_079.jpg)
- **Commons `Artist` 필드**: Titian
- **라이선스**: Public domain
- **내려받은 해상도**: 2517x2824 (Commons 원본 2517x2824) · 7010 KB

## femme-au-miroir

- **Commons 파일**: [Portrait d'une Femme à sa Toilette, by Titian, from C2RMF retouched.jpg](https://commons.wikimedia.org/wiki/File%3APortrait_d'une_Femme_%C3%A0_sa_Toilette%2C_by_Titian%2C_from_C2RMF_retouched.jpg)
- **Commons `Artist` 필드**: Titian
- **라이선스**: Public domain
- **내려받은 해상도**: 3302x4097 (Commons 원본 13602x16875) · 6350 KB

## pelerins-emmaus

- **Commons 파일**: [Les Pèlerins d'Emmaüs - Paolo Veronese - Musée du Louvre Peintures INV 146 ; MR 385.jpg](https://commons.wikimedia.org/wiki/File%3ALes_P%C3%A8lerins_d'Emma%C3%BCs_-_Paolo_Veronese_-_Mus%C3%A9e_du_Louvre_Peintures_INV_146_%3B_MR_385.jpg)
- **Commons `Artist` 필드**: Paolo Veronese
- **라이선스**: Public domain
- **내려받은 해상도**: 4096x2352 (Commons 원본 10300x5915) · 2646 KB

## suzanne-au-bain

- **Commons 파일**: [Suzanne au bain - Le Tintoret - Musée du Louvre Peintures INV 568 ; MR 498.jpg](https://commons.wikimedia.org/wiki/File%3ASuzanne_au_bain_-_Le_Tintoret_-_Mus%C3%A9e_du_Louvre_Peintures_INV_568_%3B_MR_498.jpg)
- **Commons `Artist` 필드**: Jacopo Tintoretto
- **라이선스**: Public domain
- **내려받은 해상도**: 4096x2811 (Commons 원본 6465x4437) · 3838 KB
