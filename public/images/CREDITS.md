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

## radeau-de-la-meduse

- **Commons 파일**: [JEAN LOUIS THÉODORE GÉRICAULT - La Balsa de la Medusa (Museo del Louvre, 1818-19).jpg](https://commons.wikimedia.org/wiki/File%3AJEAN_LOUIS_TH%C3%89ODORE_G%C3%89RICAULT_-_La_Balsa_de_la_Medusa_(Museo_del_Louvre%2C_1818-19).jpg)
- **Commons `Artist` 필드**: Théodore Géricault
- **라이선스**: Public domain
- **내려받은 해상도**: 4096x2796 (Commons 원본 5872x4008) · 3698 KB

## liberte-guidant-le-peuple

- **Commons 파일**: [La Liberté guidant le peuple - Eugène Delacroix - Musée du Louvre Peintures RF 129 - après restauration 2024.jpg](https://commons.wikimedia.org/wiki/File%3ALa_Libert%C3%A9_guidant_le_peuple_-_Eug%C3%A8ne_Delacroix_-_Mus%C3%A9e_du_Louvre_Peintures_RF_129_-_apr%C3%A8s_restauration_2024.jpg)
- **Commons `Artist` 필드**: Eugène Delacroix
- **라이선스**: Public domain
- **내려받은 해상도**: 4096x3277 (Commons 원본 10128x8103) · 2724 KB

## sacre-de-napoleon

- **Commons 파일**: [Jacques-Louis David - The Coronation of Napoleon (1805-1807).jpg](https://commons.wikimedia.org/wiki/File%3AJacques-Louis_David_-_The_Coronation_of_Napoleon_(1805-1807).jpg)
- **Commons `Artist` 필드**: Jacques-Louis David / Georges Rouget
- **라이선스**: Public domain
- **내려받은 해상도**: 4096x2576 (Commons 원본 6000x3773) · 2653 KB

## mort-de-sardanapale

- **Commons 파일**: [Mort de Sardanapale - Eugène Delacroix - Musée du Louvre Peintures RF 2346.jpg](https://commons.wikimedia.org/wiki/File%3AMort_de_Sardanapale_-_Eug%C3%A8ne_Delacroix_-_Mus%C3%A9e_du_Louvre_Peintures_RF_2346.jpg)
- **Commons `Artist` 필드**: Eugène Delacroix
- **라이선스**: Public domain
- **내려받은 해상도**: 4096x3206 (Commons 원본 8805x6891) · 2640 KB

## pestiferes-de-jaffa

- **Commons 파일**: [Antoine-Jean Gros - Bonaparte Visiting the Plague Victims of Jaffa.jpeg](https://commons.wikimedia.org/wiki/File%3AAntoine-Jean_Gros_-_Bonaparte_Visiting_the_Plague_Victims_of_Jaffa.jpeg)
- **Commons `Artist` 필드**: Antoine-Jean Gros
- **라이선스**: Public domain
- **내려받은 해상도**: 4018x2909 (Commons 원본 4018x2909) · 5619 KB

## les-sabines

- **Commons 파일**: [The Intervention of the Sabine Women - David (Louvre INV 3691).jpg](https://commons.wikimedia.org/wiki/File%3AThe_Intervention_of_the_Sabine_Women_-_David_(Louvre_INV_3691).jpg)
- **Commons `Artist` 필드**: Jacques-Louis David
- **라이선스**: Public domain
- **내려받은 해상도**: 4096x3080 (Commons 원본 9837x7396) · 2516 KB

## vierge-aux-rochers

- **Commons 파일**: [Leonardo Da Vinci - Vergine delle Rocce (Louvre).jpg](https://commons.wikimedia.org/wiki/File%3ALeonardo_Da_Vinci_-_Vergine_delle_Rocce_(Louvre).jpg)
- **Commons `Artist` 필드**: Leonardo da Vinci
- **라이선스**: Public domain
- **내려받은 해상도**: 2583x4096 (Commons 원본 3460x5487) · 6892 KB

## sainte-anne

- **Commons 파일**: [Leonardo da Vinci - Virgin and Child with St Anne C2RMF retouched.jpg](https://commons.wikimedia.org/wiki/File%3ALeonardo_da_Vinci_-_Virgin_and_Child_with_St_Anne_C2RMF_retouched.jpg)
- **Commons `Artist` 필드**: 알 수 없음
- **라이선스**: Public domain
- **내려받은 해상도**: 3055x4097 (Commons 원본 13295x17828) · 6296 KB

## saint-jean-baptiste

- **Commons 파일**: [Leonardo da Vinci - Saint John the Baptist C2RMF retouched.jpg](https://commons.wikimedia.org/wiki/File%3ALeonardo_da_Vinci_-_Saint_John_the_Baptist_C2RMF_retouched.jpg)
- **Commons `Artist` 필드**: Leonardo da Vinci
- **라이선스**: Public domain
- **내려받은 해상도**: 3164x4096 (Commons 원본 10446x13522) · 4561 KB

## la-belle-jardiniere

- **Commons 파일**: [La Vierge à l'Enfant avec le petit saint Jean Baptiste - Raphaël - Musée du Louvre Peintures INV 602 ; MR 433.jpg](https://commons.wikimedia.org/wiki/File%3ALa_Vierge_%C3%A0_l'Enfant_avec_le_petit_saint_Jean_Baptiste_-_Rapha%C3%ABl_-_Mus%C3%A9e_du_Louvre_Peintures_INV_602_%3B_MR_433.jpg)
- **Commons `Artist` 필드**: Raphael
- **라이선스**: Public domain
- **내려받은 해상도**: 2634x4096 (Commons 원본 6880x10699) · 4842 KB

## le-condottiere

- **Commons 파일**: [Antonello da Messina - Portrait of a Man (Il Condottiere) cleaned version.jpg](https://commons.wikimedia.org/wiki/File%3AAntonello_da_Messina_-_Portrait_of_a_Man_(Il_Condottiere)_cleaned_version.jpg)
- **Commons `Artist` 필드**: Wilfredor
- **라이선스**: Public domain
- **내려받은 해상도**: 3655x4096 (Commons 원본 4654x5216) · 1701 KB

## saint-sebastien

- **Commons 파일**: [Saint Sebastian by Mantegna (Louvre).jpg](https://commons.wikimedia.org/wiki/File%3ASaint_Sebastian_by_Mantegna_(Louvre).jpg)
- **Commons `Artist` 필드**: Andrea Mantegna
- **라이선스**: Public domain
- **내려받은 해상도**: 2202x4096 (Commons 원본 3454x6425) · 12053 KB
