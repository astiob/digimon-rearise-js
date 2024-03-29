import {LanguageCodeType} from './apitypes'

export type EnglishLanguageTag = 'en-JP' | 'en-US'
export type LanguageTag = 'ja' | EnglishLanguageTag | 'ko' | 'zh-TW'
export type OutputLanguageTag = LanguageTag | 'en'
export const languageTagFromCodeType: { readonly [LCT in LanguageCodeType]: LanguageTag } = {
	[LanguageCodeType.Ja]: 'ja',
	[LanguageCodeType.En]: 'en-US',
	[LanguageCodeType.Ko]: 'ko',
	[LanguageCodeType.Zh]: 'zh-TW',
}

export type InternationalizedString = { [LT in LanguageTag]?: string }
export type CompactInternationalizedString = (string | null)[]

type FullEnglishString = string | { readonly [LT in EnglishLanguageTag]: string }
type FullEnglishStrings = { readonly [ja: string]: FullEnglishString }

type PartialEnglishString = string | { readonly [LT in EnglishLanguageTag]?: string }
type PartialEnglishStrings = { readonly [ja: string]: PartialEnglishString }

// const englishPrefixes: FullEnglishStrings = {
// 	'炎熱': 'Fire',
// 	'水氷': '',
// 	'草花': '',
// 	'大地': '',
// 	'空風': '',
// 	'電磁': '',
// 	'神聖': '',
// 	'暗黒': '',
// 	'無': '',
// 	'攻Ⅳ(': 'Attack IV (',
// }

const englishSuffixes: FullEnglishStrings = {
	'(X抗体)': ' (X-Antibody)',
	'(分離)': ' (Detached)',
	'(善)': {'en-JP': ' (Virtue)', 'en-US': ' (Good)'},
	'(変異)': ' (Mutant)',
	'(完全体)': {'en-JP': ' (Perfect)', 'en-US': ' (Ultimate)'},
	'(幼年期)': {'en-JP': ' (Baby)', 'en-US': ' (In-Training)'},
	'(幼年期I)': {'en-JP': ' (Baby I)', 'en-US': ' (In-Training I)'},
	'(幼年期II)': {'en-JP': ' (Baby II)', 'en-US': ' (In-Training II)'},
	'(悪)': {'en-JP': ' (Vice)', 'en-US': ' (Evil)'},
	'(成熟期)': {'en-JP': ' (Adult)', 'en-US': ' (Champion)'},
	'(成長期)': {'en-JP': ' (Child)', 'en-US': ' (Rookie)'},
	'(橙)': ' (Orange)',
	'(白)': ' (White)',
	'(究極体)': {'en-JP': ' (Ultimate)', 'en-US': ' (Mega)'},
	'(紫)': ' (Violet)',
	'(緑)': ' (Green)',
	'(覚醒)': ' (Awakened)',
	'(赤)': ' (Red)',
	'(超究極体)': {'en-JP': ' (Super Ultimate)', 'en-US': ' (Ultra)'},
	'(金)': ' (Gold)',
	'(銀)': ' (Silver)',
	'(青)': ' (Blue)',
	'(黄)': ' (Yellow)',
	'(黒)': ' (Black)',
	'[2周年記念]': {'en-JP': ' [2nd Anniversary Celebration]', 'en-US': ' [Ann. Camp.]'},
	'[Anniv.]': ' [Anniv.]',
	'[BCE]': ' [BCE]',
	'[BP]': ' [BP]',
	'[CBE]': ' [CBE]',
	'[DFQ]': {'en-JP': ' [DFQ]', 'en-US': ' [SDQ]'},
	'[S02記念]': ' [S02 Celebration]',
	'[UWD]': ' [UWD]',
	'[ゴーグルver]': {'en-JP': ' [Goggles ver]', 'en-US': ' (Goggles Ver.)'},
	'[デジアド20th]': ' [Digi-Adv. 20th]',
	'X抗体': ' X-Antibody',
	'完全体': {'en-JP': ' Perfect', 'en-US': ' Ultimate'},
	'幼年期': {'en-JP': ' Baby', 'en-US': ' In-Training'},
	'幼年期I': {'en-JP': ' Baby I', 'en-US': ' In-Training I'},
	'幼年期II': {'en-JP': ' Baby II', 'en-US': ' In-Training II'},
	'成熟期': {'en-JP': ' Adult', 'en-US': ' Champion'},
	'成長期': {'en-JP': ' Child', 'en-US': ' Rookie'},
	'究極体': {'en-JP': ' Ultimate', 'en-US': ' Mega'},
	'超究極体': {'en-JP': ' Super Ultimate', 'en-US': ' Ultra'},
	'の進化コード': {'en-JP': ' Evolution Code', 'en-US': ' DGV-Code'},
	'・下級': ' (Easy)',
	'・中級': ' (Normal)',
	'・上級': ' (Hard)',
	// ')': ')',
}

const englishNames: PartialEnglishStrings = {
	'超進化コード': {'en-JP': 'Super Evolution Code', 'en-US': 'Super DGV-Code'},
	'もんざえモン': 'Monzaemon',
	'アイスデビモン': 'IceDevimon',
	'アイスモン': 'Icemon',
	'アカトリモン': 'Akatorimon',
	'アクィラモン': 'Aquilamon',
	'アグニモン': {'en-JP': 'Agnimon', 'en-US': 'Agunimon'},
	'アグモン 勇気の絆': {'en-JP': 'Agumon -Yuki no Kizuna-', 'en-US': 'Agumon (Bond of Bravery)'},
	'アグモン -勇気の絆-': {'en-JP': 'Agumon -Yuki no Kizuna-', 'en-US': 'Agumon (Bond of Bravery)'},
	'アグモン': 'Agumon',
	'アグモン(黒)': 'Agumon (Black)',
	'アトラーカブテリモン': {'en-JP': 'AtlurKabuterimon', 'en-US': 'MegaKabuterimon'},
	'アトラーカブテリモン(青)': {'en-JP': 'AtlurKabuterimon (Blue)', 'en-US': 'MegaKabuterimon (Blue)'},
	'アポカリモン': {'en-JP': 'Apocalymon', 'en-US': 'Apokarimon'},
	'アポロモン': 'Apollomon',
	'アルカディモン': {'en-JP': 'Arkadimon', 'en-US': 'Arcadiamon'},
	// Parenthesized versions should be aliases of the non-parenthesized ones, unless word splitting does that automatically
	'アルカディモン(完全体)': {'en-JP': 'Arkadimon (Perfect)', 'en-US': 'Arcadiamon (Ultimate)'},
	'アルカディモン(幼年期)': {'en-JP': 'Arkadimon (Baby)', 'en-US': 'Arcadiamon (In-Training)'},
	'アルカディモン(成熟期)': {'en-JP': 'Arkadimon (Adult)', 'en-US': 'Arcadiamon (Champion)'},
	'アルカディモン(成長期)': {'en-JP': 'Arkadimon (Child)', 'en-US': 'Arcadiamon (Rookie)'},
	'アルカディモン(究極体)': {'en-JP': 'Arkadimon (Ultimate)', 'en-US': 'Arcadiamon (Mega)'},
	'アルカディモン(超究極体)': {'en-JP': 'Arkadimon (Super Ultimate)', 'en-US': 'Arcadiamon (Ultra)'},
	'アルカディモン完全体': {'en-JP': 'Arkadimon Perfect', 'en-US': 'Arcadiamon Ultimate'},
	'アルカディモン幼年期': {'en-JP': 'Arkadimon Baby', 'en-US': 'Arcadiamon In-Training'},
	'アルカディモン成熟期': {'en-JP': 'Arkadimon Adult', 'en-US': 'Arcadiamon Champion'},
	'アルカディモン成長期': {'en-JP': 'Arkadimon Child', 'en-US': 'Arcadiamon Rookie'},
	'アルカディモン究極体': {'en-JP': 'Arkadimon Ultimate', 'en-US': 'Arcadiamon Mega'},
	'アルカディモン超究極体': {'en-JP': 'Arkadimon Super Ultimate', 'en-US': 'Arcadiamon Ultra'},
	'アルケニモン': {'en-JP': 'Archnemon', 'en-US': 'Arukenimon'},
	'アルゴモン': {'en-JP': 'Algomon', 'en-US': 'Argomon'},
	'アルゴモン(完全体)': {'en-JP': 'Algomon (Perfect)', 'en-US': 'Argomon (Ultimate)'},
	'アルゴモン(幼年期I)': {'en-JP': 'Algomon (Baby I)', 'en-US': 'Argomon (In-Training I)'},
	'アルゴモン(幼年期II)': {'en-JP': 'Algomon (Baby II)', 'en-US': 'Argomon (In-Training II)'},
	'アルゴモン(成熟期)': {'en-JP': 'Algomon (Adult)', 'en-US': 'Argomon (Champion)'},
	'アルゴモン(成長期)': {'en-JP': 'Algomon (Child)', 'en-US': 'Argomon (Rookie)'},
	'アルゴモン(究極体)': {'en-JP': 'Algomon (Ultimate)', 'en-US': 'Argomon (Mega)'},
	'アルゴモン完全体': {'en-JP': 'Algomon Perfect', 'en-US': 'Argomon Ultimate'},
	'アルゴモン幼年期I': {'en-JP': 'Algomon Baby I', 'en-US': 'Argomon In-Training I'},
	'アルゴモン幼年期II': {'en-JP': 'Algomon Baby II', 'en-US': 'Argomon In-Training II'},
	'アルゴモン成熟期': {'en-JP': 'Algomon Adult', 'en-US': 'Argomon Champion'},
	'アルゴモン成長期': {'en-JP': 'Algomon Child', 'en-US': 'Argomon Rookie'},
	'アルゴモン究極体': {'en-JP': 'Algomon Ultimate', 'en-US': 'Argomon Mega'},
	'アルファモン': 'Alphamon',
	'アルファモンNX': 'Alphamon NX',
	'アルファモン王竜剣': 'Alphamon Ouryuken',
	'アルフォースブイドラモン': {'en-JP': 'UlforceVdramon', 'en-US': 'UlforceVeedramon'},
	'アルフォースブイドラモン(X抗体)': {'en-JP': 'UlforceVdramon (X-Antibody)', 'en-US': 'UlforceVeedramon (X-Antibody)'},
	'アルフォースブイドラモンFM': {'en-JP': 'UlforceVdramon FM', 'en-US': 'UlforceVeedramon FM'},
	'アルフォースブイドラモンX抗体': {'en-JP': 'UlforceVdramon X-Antibody', 'en-US': 'UlforceVeedramon X-Antibody'},
	'アルマジモン': 'Armadimon',
	'アレスタードラモン': 'Arresterdramon',
	'アンキロモン': 'Ankylomon',
	'アンティラモン': {'en-JP': 'Andiramon', 'en-US': 'Antylamon'},
	'アンドロモン': 'Andromon',
	'アーマゲモン': {'en-JP': 'Armagemon', 'en-US': 'Armageddemon'},
	'イグドラシル': {'en-JP': 'Yggdrasill', 'en-US': 'King Drasil'},
	'イグドラシル_7D6': {'en-JP': 'Yggdrasill_7D6', 'en-US': 'King Drasil_7D6'},
	'イッカクモン': 'Ikkakumon',
	'インセキモン': {'en-JP': 'Insekimon', 'en-US': 'Meteormon'},
	'インダラモン': {'en-JP': 'Indaramon', 'en-US': 'Indramon'},
	'インフェルモン': 'Infermon',
	'インプモン': 'Impmon',
	'インペリアルドラモンDM': 'Imperialdramon DM',
	'インペリアルドラモンFM': 'Imperialdramon FM',
	'インペリアルドラモンPM': 'Imperialdramon PM',
	'イーバモン': 'Ebemon',
	'ウィザーモン': {'en-JP': 'Wizarmon', 'en-US': 'Wizardmon'},
	'ウイングドラモン': 'Wingdramon',
	'ウェヌスモン': 'Venusmon',
	'ウォーグレイモン': 'WarGreymon',
	'ウォーグレイモン(X抗体)': 'WarGreymon (X-Antibody)',
	'ウォーグレイモンX抗体': 'WarGreymon X-Antibody',
	'ウッドモン': 'Woodmon',
	'ウルカヌスモン': 'Vulcanusmon',
	'エアドラモン': 'Airdramon',
	'エアロブイドラモン': {'en-JP': 'Earo V-dramon', 'en-US': 'AeroVeedramon'},
	'エクスブイモン': {'en-JP': 'XV-mon', 'en-US': 'ExVeemon'},
	'エグザモン': 'Examon',
	'エグザモン(X抗体)': 'Examon (X-Antibody)',
	'エグザモンX抗体': 'Examon X-Antibody',
	'エテモン': 'Etemon',
	'エリスモン': 'Herissmon',
	'エレキモン': 'Elecmon',
	'エレキモン(紫)': 'Elecmon (Violet)',
	'エンシェントイリスモン': {'en-JP': 'AncientIrismon', 'en-US': 'AncientKazemon'},
	'エンシェントガルルモン': 'AncientGarurumon',
	'エンシェントグレイモン': 'AncientGreymon',
	'エンシェントスフィンクモン': {'en-JP': 'AncientSphinkmon', 'en-US': 'AncientSphinxmon'},
	'エンシェントトロイアモン': 'AncientTroiamon',
	'エンシェントビートモン': {'en-JP': 'AncientBeatmon', 'en-US': 'AncientBeetlemon'},
	'エンシェントボルケーモン': {'en-JP': 'AncientVolcamon', 'en-US': 'AncientVolcanomon'},
	'エンシェントマーメイモン': {'en-JP': 'AncientMermaimon', 'en-US': 'AncientMermaidmon'},
	'エンシェントメガテリウモン': {'en-JP': 'AncientMegatheriumon', 'en-US': 'AncientMegatheriummon'},
	'エンシェントワイズモン': {'en-JP': 'AncientWisetmon', 'en-US': 'AncientWisemon'},
	'エンジェウーモン': 'Angewomon',
	'エンジェモン': 'Angemon',
	'オウリュウモン': 'Ouryumon',
	'オオクワモン': 'Okuwamon',
	'オタマモン': 'Otamamon',
	'オファニモン': {'en-JP': 'Ofanimon', 'en-US': 'Ophanimon'},
	'オファニモンFM': {'en-JP': 'Ofanimon FM', 'en-US': 'Ophanimon FM'},
	'オメカモン': 'Omekamon',
	'オメガシャウトモン': {'en-JP': 'OmegaShoutmon', 'en-US': 'OmniShoutmon'},
	'オメガモン': 'Omegamon',
	'オメガモン(X抗体)': 'Omegamon (X-Antibody)',
	'オメガモンAlter-B': 'Omegamon Alter-B',
	'オメガモンAlter-S': 'Omegamon Alter-S',
	'オメガモンMM': 'Omegamon MM',
	'オメガモンNX': 'Omegamon NX',
	'オメガモンX抗体': 'Omegamon X-Antibody',
	'オメガモンズワルト': 'Omegamon Zwart',
	'オメガモンズワルトD': 'Omegamon Zwart D',
	'オメダモン': 'Omedamon',
	'オロチモン': 'Orochimon',
	'オーガモン': {'en-JP': 'Orgemon', 'en-US': 'Ogremon'},
	'カイゼルグレイモン': 'KaiserGreymon',
	'カオスデュークモン': {'en-JP': 'ChaosDukemon', 'en-US': 'ChaosGallantmon'},
	'カオスドラモン': 'Chaosdramon',
	'カオスモン': 'Chaosmon',
	'カオスモンVA': 'Chaosmon VA',
	'カメモン': 'Kamemon',
	'カラツキヌメモン': {'en-JP': 'KaratukiNumemon', 'en-US': 'ShellNumemon'},
	'ガイオウモン': {'en-JP': 'Gaioumon', 'en-US': 'Gaiomon'},
	// en-US is just a guess. en-JP uses a hyphen in DRB, but their ja uses a colon, which is absent here.
	'ガイオウモン厳刀ノ型': {'en-JP': 'Gaioumon Itto Mode', 'en-US': 'Gaiomon Itto Mode'},
	'ガオガモン': 'Gaogamon',
	'ガオモン': 'Gaomon',
	'ガジモン': 'Gazimon',
	'ガブモン 友情の絆': {'en-JP': 'Gabumon -Yujo no Kizuna-', 'en-US': 'Gabumon (Bond of Friendship)'},
	'ガブモン -友情の絆-': {'en-JP': 'Gabumon -Yujo no Kizuna-', 'en-US': 'Gabumon (Bond of Friendship)'},
	'ガブモン': 'Gabumon',
	'ガブモン(黒)': 'Gabumon (Black)',
	'ガムドラモン': 'Gumdramon',
	'ガルゴモン': {'en-JP': 'Galgomon', 'en-US': 'Gargomon'},
	'ガルダモン': 'Garudamon',
	'ガルフモン': 'Gulfmon',
	'ガルムモン': {'en-JP': 'Garummon', 'en-US': 'KendoGarurumon'},
	'ガルルモン': 'Garurumon',
	'ガルルモン(黒)': 'Garurumon (Black)',
	'ガンクゥモン': 'Gankoomon',
	'ガンクゥモン(X抗体)': 'Gankoomon (X-Antibody)',
	'ガンクゥモンX抗体': 'Gankoomon X-Antibody',
	'ガードロモン': 'Guardromon',
	'ガードロモン(金)': 'Guardromon (Gold)',
	'キメラモン': {'en-JP': 'Chimairamon', 'en-US': 'Kimeramon'},
	'キャッチマメモン': 'CatchMamemon',
	'キャノンビーモン': 'CannonBeemon',
	'キュウビモン': 'Kyubimon',
	'キョキョモン': 'Kyokyomon',
	'キングエテモン': 'KingEtemon',
	'ギガドラモン': 'Gigadramon',
	'ギギモン': 'Gigimon',
	'ギルモン': 'Guilmon',
	'ギンリュウモン': 'Ginryumon',
	'クズハモン': 'Kuzuhamon',
	'クズハモンMM': 'Kuzuhamon MM',
	'クダモン': 'Kudamon',
	'クラモン': 'Kuramon',
	'クリアアグモン': 'ClearAgumon',
	'クリサリモン': 'Chrysalimon',
	'クリスペイルドラモン': 'CrysPaledramon',
	'クレシェモン': 'Crescemon',
	'クレニアムモン': {'en-JP': 'Craniummon', 'en-US': 'Craniamon'},
	'クレニアムモン(X抗体)': {'en-JP': 'Craniummon (X-Antibody)', 'en-US': 'Craniamon (X-Antibody)'},
	'クレニアムモンX抗体': {'en-JP': 'Craniummon X-Antibody', 'en-US': 'Craniamon X-Antibody'},
	'クロックモン': 'Clockmon',
	'クワガーモン': 'Kuwagamon',
	'クンビラモン': 'Kumbhiramon',
	'クーレスガルルモン': 'CresGarurumon',
	'グミモン': 'Gummymon',
	'グラウモン': {'en-JP': 'Growmon', 'en-US': 'Growlmon'},
	'グラウンドラモン': 'Groundramon',
	'グラップレオモン': {'en-JP': 'GrappuLeomon', 'en-US': 'GrapLeomon'},
	'グランクワガーモン': 'GranKuwagamon',
	'グランドラクモン': {'en-JP': 'GrandDracumon', 'en-US': 'GranDracmon'},
	'グランドロコモン': {'en-JP': 'GrandLocomon', 'en-US': 'GroundLocomon'},
	'グリズモン': {'en-JP': 'Gryzmon', 'en-US': 'Grizzlymon'},
	'グリフォモン': {'en-JP': 'Griffomon', 'en-US': 'Gryphonmon'},
	'グルルモン': 'Gururumon',
	'グレイスノヴァモン': 'GraceNovamon',
	'グレイドモン': 'Grademon',
	'グレイモン': 'Greymon',
	'グレイモン(青)': 'Greymon (Blue)',
	'ケラモン': 'Keramon',
	'ケルビモン': 'Cherubimon',
	'ケルビモン(善)': {'en-JP': 'Cherubimon (Virtue)', 'en-US': 'Cherubimon (Good)'},
	'ケルビモン(悪)': {'en-JP': 'Cherubimon (Vice)', 'en-US': 'Cherubimon (Evil)'},
	'ケレスモン': 'Ceresmon',
	'ケンタルモン': {'en-JP': 'Centalmon', 'en-US': 'Centarumon'},
	'ゲコモン': 'Gekomon',
	'ゲレモン': 'Geremon',
	'コアドラモン(緑)': 'Coredramon (Green)',
	'コアドラモン(青)': 'Coredramon (Blue)',
	'ココモン': {'en-JP': 'Cocomon', 'en-US': 'Conomon'},
	'コロナモン': 'Coronamon',
	'コロモン': 'Koromon',
	'ゴッドドラモン': {'en-JP': 'Goddramon', 'en-US': 'Goldramon'},
	'ゴツモン': {'en-JP': 'Gottsumon', 'en-US': 'Gotsumon'},
	'ゴブリモン': 'Goblimon',
	'ゴマモン': 'Gomamon',
	'ゴールドヌメモン': 'GoldNumemon',
	'ゴールドブイドラモン': {'en-JP': 'GoldV-dramon', 'en-US': 'GoldVeedramon'},
	'サイクロモン': {'en-JP': 'Cyclomon', 'en-US': 'Cyclonemon'},
	'サイバードラモン': 'Cyberdramon',
	'サクットモン': 'Sakuttomon',
	'サクモン': 'Sakumon',
	'サクヤモン': 'Sakuyamon',
	'サクヤモンMM': 'Sakuyamon MM',
	'サジタリモン': 'Sagittarimon',
	'サブマリモン': {'en-JP': 'Sabmarimon', 'en-US': 'Submarimon'},
	'サングルゥモン': 'Sangloupmon',
	'サンティラモン': 'Sandiramon',
	'サンフラウモン': 'Sunflowmon',
	'サンモン': 'Sunmon',
	'サーベルレオモン': 'SaberLeomon',
	'シェンウーモン': 'Xuanwumon',
	'シスタモン シエル': 'Sistermon Ciel',
	'シスタモン シエル(覚醒)': 'Sistermon Ciel (Awakened)',
	'シスタモン ノワール': 'Sistermon Noir',
	'シスタモン ノワール(覚醒)': 'Sistermon Noir (Awakened)',
	'シスタモン ブラン': 'Sistermon Blanc',
	'シスタモン ブラン(覚醒)': 'Sistermon Blanc (Awakened)',
	'シャイングレイモン': 'ShineGreymon',
	'シャイングレイモンBM': 'ShineGreymon BM',
	'シャイングレイモンRM': 'ShineGreymon RM',
	'シャウトモン': 'Shoutmon',
	'シャコモン': {'en-JP': 'Shakomon', 'en-US': 'Syakomon'},
	'シャッコウモン': 'Shakkoumon',
	'シュリモン': 'Shurimon',
	'シルフィーモン': 'Silphymon',
	'シンドゥーラモン': 'Sinduramon',
	'シードラモン': 'Seadramon',
	'シーラモン': 'Coelamon',
	'ジエスモン': 'Jesmon',
	'ジエスモン(X抗体)': 'Jesmon (X-Antibody)',
	'ジエスモンGX': 'Jesmon GX',
	'ジエスモンX抗体': 'Jesmon X-Antibody',
	'ジオグレイモン': 'GeoGreymon',
	'ジジモン': 'Jijimon',
	'ジャザモン': 'Jazamon',
	'ジャザリッヒモン': 'Jazarichmon',
	'ジャザードモン': 'Jazardmon',
	'ジャスティモン': 'Justimon',
	'ジャリモン': 'Jyarimon',
	'ジュレイモン': {'en-JP': 'Jyureimon', 'en-US': 'Cherrymon'},
	'スカモン': {'en-JP': 'Scumon', 'en-US': 'Sukamon'},
	'スカモン大王': {'en-JP': 'Scumon-daiou', 'en-US': 'KingSukamon'},
	'スカルグレイモン': 'SkullGreymon',
	'スカルサタモン': 'SkullSatamon',
	'スカルバルキモン': 'SkullBaluchimon',
	'スサノオモン': 'Susanoomon',
	'スターモン': 'Starmon',
	'スティフィルモン': 'Stefilmon',
	'スティングモン': 'Stingmon',
	'ストライクドラモン': 'Strikedramon',
	'スレイプモン': {'en-JP': 'Sleipmon', 'en-US': 'Kentaurosmon'},
	'スレイプモン(X抗体)': {'en-JP': 'Sleipmon (X-Antibody)', 'en-US': 'Kentaurosmon (X-Antibody)'},
	'スレイプモンX抗体': {'en-JP': 'Sleipmon X-Antibody', 'en-US': 'Kentaurosmon X-Antibody'},
	'スレイヤードラモン': 'Slayerdramon',
	'スーツェーモン': 'Zhuqiaomon',
	'スーパースターモン': 'Superstarmon',
	'ズドモン': 'Zudomon',
	'ズバイガーモン': 'ZubaEagermon',
	'ズバモン': 'Zubamon',
	'セイバーハックモン': {'en-JP': 'SaviorHuckmon', 'en-US': 'SaviorHackmon'},
	'セラフィモン': 'Seraphimon',
	'セントガルゴモン': {'en-JP': 'SaintGalgomon', 'en-US': 'MegaGargomon'},
	'セーバードラモン': 'Saberdramon',
	'ゼリモン': 'Zerimon',
	'ソーサリモン': {'en-JP': 'Sorcerimon', 'en-US': 'Sorcermon'},
	'ソーラーモン': 'Solarmon',
	'タイガーヴェスパモン': 'TigerVespamon',
	'タイタモン': 'Titamon',
	'タイラントカブテリモン': 'TyrantKabuterimon',
	'タオモン': 'Taomon',
	'タスクモン': 'Tuskmon',
	'タネモン': 'Tanemon',
	'タンクモン': 'Tankmon',
	'ダゴモン': {'en-JP': 'Dagomon', 'en-US': 'Dragomon'},
	'ダークドラモン': 'Darkdramon',
	'チィリンモン': {'en-JP': 'Tyilinmon', 'en-US': 'Chirinmon'},
	'チコモン': {'en-JP': 'Chicomon', 'en-US': 'Chibomon'},
	'チビモン': {'en-JP': 'Chibimon', 'en-US': 'DemiVeemon'},
	'チャツラモン': 'Caturamon',
	'チューモン': {'en-JP': 'Tyumon', 'en-US': 'Chuumon'},
	'チョコモン': {'en-JP': 'Chocomon', 'en-US': 'Kokomon'},
	'チンロンモン': {'en-JP': 'Qinglongmon', 'en-US': 'Azulongmon'},
	'ツカイモン': {'en-JP': 'Tukaimon', 'en-US': 'Tsukaimon'},
	'ツチダルモン': {'en-JP': 'Tuchidarumon', 'en-US': 'MudFrigimon'},
	'ツノモン': {'en-JP': 'Tunomon', 'en-US': 'Tsunomon'},
	'ツメモン': 'Tsumemon',
	'ティラノモン': {'en-JP': 'Tyranomon', 'en-US': 'Tyrannomon'},
	'テイルモン': {'en-JP': 'Tailmon', 'en-US': 'Gatomon'},
	'テリアモン': 'Terriermon',
	'テントモン': 'Tentomon',
	'ディアナモン': 'Dianamon',
	'ディアボロモン': {'en-JP': 'Diablomon', 'en-US': 'Diaboromon'},
	'ディノヒューモン': 'Dinohumon',
	'ディノビーモン': 'DinoBeemon',
	'デクスドルガモン': {'en-JP': 'Death-X-Dorugamon', 'en-US': 'DexDorugamon'},
	'デクスドルグレモン': {'en-JP': 'Death-X-Doruguremon', 'en-US': 'DexDoruGreymon'},
	'デクスドルゴラモン': {'en-JP': 'Death-X-Dorugoramon', 'en-US': 'DexDorugoramon'},
	'デクスモン': {'en-JP': 'Death-X-mon', 'en-US': 'Dexmon'},
	'デジタマモン': 'Digitamamon',
	'デスメラモン': {'en-JP': 'DeathMeramon', 'en-US': 'SkullMeramon'},
	'デビモン': 'Devimon',
	'デュナスモン': 'Dynasmon',
	'デュナスモン(X抗体)': 'Dynasmon (X-Antibody)',
	'デュナスモンX抗体': 'Dynasmon X-Antibody',
	'デュラモン': 'Duramon',
	'デュランダモン': 'Durandamon',
	'デュークモン': {'en-JP': 'Dukemon', 'en-US': 'Gallantmon'},
	'デュークモン(X抗体)': {'en-JP': 'Dukemon (X-Antibody)', 'en-US': 'Gallantmon (X-Antibody)'},
	'デュークモンCM': {'en-JP': 'Dukemon CM', 'en-US': 'Gallantmon CM'},
	'デュークモンNX': {'en-JP': 'Dukemon NX', 'en-US': 'Gallantmon NX'},
	'デュークモンX抗体': {'en-JP': 'Dukemon X-Antibody', 'en-US': 'Gallantmon X-Antibody'},
	'デーモン': {'en-JP': 'Demon', 'en-US': 'Creepymon'},
	'トイアグモン': 'ToyAgumon',
	'トイアグモン(黒)': 'ToyAgumon (Black)',
	'トゥルイエモン': 'Turuiemon',
	'トゲモン': 'Togemon',
	'トコモン': 'Tokomon',
	'トノサマゲコモン': {'en-JP': 'TonosamaGekomon', 'en-US': 'ShogunGekomon'},
	'トリケラモン': 'Triceramon',
	'ドゥフトモン': {'en-JP': 'Duftmon', 'en-US': 'Leopardmon'},
	'ドゥフトモン(X抗体)': {'en-JP': 'Duftmon (X-Antibody)', 'en-US': 'Leopardmon (X-Antibody)'},
	'ドゥフトモンLM': {'en-JP': 'Duftmon LM', 'en-US': 'Leopardmon LM'},
	'ドゥフトモンNX': {'en-JP': 'Duftmon NX', 'en-US': 'Leopardmon NX'},
	'ドゥフトモンX抗体': {'en-JP': 'Duftmon X-Antibody', 'en-US': 'Leopardmon X-Antibody'},
	'ドウモン': 'Doumon',
	'ドドモン': 'Dodomon',
	'ドラクモン': {'en-JP': 'Dracumon', 'en-US': 'Dracmon'},
	'ドラコモン': 'Dracomon',
	'ドリモン': 'Dorimon',
	'ドルガモン': {'en-JP': 'Dorugamon', 'en-US': 'Dorugamon'},
	'ドルグレモン': {'en-JP': 'Doruguremon', 'en-US': 'DoruGreymon'},
	'ドルゴラモン': {'en-JP': 'Dorugoramon', 'en-US': 'Dorugoramon'},
	'ドルモン': {'en-JP': 'Dorumon', 'en-US': 'Dorumon'},
	'ナイトモン': 'Knightmon',
	'ナニモン': 'Nanimon',
	'ナノモン': {'en-JP': 'Nanomon', 'en-US': 'Datamon'},
	'ニャロモン': 'Nyaromon',
	'ネプトゥーンモン': 'Neptunemon',
	'ノーブルパンプモン': {'en-JP': 'NoblePumpmon', 'en-US': 'NoblePumpkinmon'},
	'ハイアンドロモン': 'HiAndromon',
	'ハグルモン': 'Hagurumon',
	'ハックモン': {'en-JP': 'Huckmon', 'en-US': 'Hackmon'},
	'バイフーモン': 'Baihumon',
	'バオハックモン': {'en-JP': 'BaoHuckmon', 'en-US': 'BaoHackmon'},
	'バクモン': {'en-JP': 'Bakumon', 'en-US': 'Tapirmon'},
	'バケモン': 'Bakemon',
	'バッカスモン': 'Bacchusmon',
	'ババモン': 'Babamon',
	'バブモン': {'en-JP': 'Bubbmon', 'en-US': 'Pabumon'},
	'バルキモン': 'Baluchimon',
	'バルバモン': 'Barbamon',
	'バンチョーゴーレモン': 'BanchoGolemon',
	'バンチョースティングモン': 'BanchoStingmon',
	'バンチョーマメモン': 'BanchoMamemon',
	'バンチョーリリモン': {'en-JP': 'BanchoLilimon', 'en-US': 'BanchoLillymon'},
	'バンチョーレオモン': 'BanchoLeomon',
	'バードラモン': 'Birdramon',
	'パイルドラモン': 'Paildramon',
	'パイルボルケーモン': 'PileVolcamon',
	'パグモン': 'Pagumon',
	'パジラモン': 'Pajiramon',
	'パタモン': 'Patamon',
	'パルモン': 'Palmon',
	'パンジャモン': {'en-JP': 'Panjyamon', 'en-US': 'IceLeomon'},
	'パンダモン': 'Pandamon',
	'パンプモン': {'en-JP': 'Pumpmon', 'en-US': 'Pumpkinmon'},
	'ヒシャリュウモン': 'Hisyaryumon',
	'ヒポグリフォモン': {'en-JP': 'Hippogriffomon', 'en-US': 'HippoGryphonmon'},
	'ビットモン': {'en-JP': 'Bitmon', 'en-US': 'Rabbitmon'},
	'ピエモン': {'en-JP': 'Piemon', 'en-US': 'Piedmon'},
	'ピコデビモン': {'en-JP': 'PicoDevimon', 'en-US': 'DemiDevimon'},
	'ピチモン': 'Pitchmon',
	'ピッコロモン': {'en-JP': 'Picklemon', 'en-US': 'Piximon'},
	'ピノッキモン': {'en-JP': 'Pinochimon', 'en-US': 'Puppetmon'},
	'ピョコモン': {'en-JP': 'Pyocomon', 'en-US': 'Yokomon'},
	'ピヨモン': {'en-JP': 'Piyomon', 'en-US': 'Biyomon'},
	'ファイラモン': 'Firamon',
	'ファルコモン': 'Falcomon',
	'ファントモン': {'en-JP': 'Fantomon', 'en-US': 'Phantomon'},
	'ファンビーモン': 'FunBeemon',
	'ファンロンモン': 'Huanglongmon',
	'フィルモン': 'Filmon',
	'フフモン': 'Fufumon',
	'フレアモン': 'Flaremon',
	'フレイドラモン': {'en-JP': 'Fladramon', 'en-US': 'Flamedramon'},
	'フーガモン': 'Fugamon',
	'フーディエモン': 'Hudiemon',
	'ブイドラモン': {'en-JP': 'V-dramon', 'en-US': 'Veedramon'},
	'ブイモン': {'en-JP': 'V-mon', 'en-US': 'Veemon'},
	'ブラックウォーグレイモン': 'BlackWarGreymon',
	'ブラックウォーグレイモン(X抗体)': 'BlackWarGreymon (X-Antibody)',
	'ブラックウォーグレイモンX抗体': 'BlackWarGreymon X-Antibody',
	'ブラックキングヌメモン': 'BlackKingNumemon',
	'ブラックテイルモン': {'en-JP': 'BlackTailmon', 'en-US': 'BlackGatomon'},
	'ブラックメガログラウモン': {'en-JP': 'BlackMegaloGrowmon', 'en-US': 'BlackWarGrowlmon'},
	'ブリッツグレイモン': 'BlitzGreymon',
	'ブルコモン': 'Bulucomon',
	'ブルモン': 'Bullmon',
	'ブルーメラモン': 'BlueMeramon',
	'ブレイクドラモン': 'Breakdramon',
	'プカモン': {'en-JP': 'Pukamon', 'en-US': 'Bukamon'},
	'プスモン': 'Pusumon',
	'プスリモン': 'Pusurimon',
	'プニモン': 'Punimon',
	'プラチナスカモン': {'en-JP': 'PlatinaSukamon', 'en-US': 'PlatinumSukamon'},
	'プラチナヌメモン': 'PlatinumNumemon',
	'プリンスマメモン': 'PrinceMamemon',
	'プルートモン': 'Plutomon',
	'プレイリモン': 'Prairiemon',
	'プレシオモン': 'Plesiomon',
	'プロットモン': {'en-JP': 'Plotmon', 'en-US': 'Salamon'},
	'ヘクセブラウモン': 'Hexeblaumon',
	'ヘラクルカブテリモン': {'en-JP': 'HerakleKabuterimon', 'en-US': 'HerculesKabuterimon'},
	'ヘヴィーレオモン': 'HeavyLeomon',
	'ベアモン': 'Bearmon',
	'ベジーモン': {'en-JP': 'Vegimon', 'en-US': 'Vegiemon'},
	'ベタモン': 'Betamon',
	'ベリアルヴァンデモン': {'en-JP': 'BelialVamdemon', 'en-US': 'MaloMyotismon'},
	'ベルゼブモン': {'en-JP': 'Beelzebumon', 'en-US': 'Beelzemon'},
	'ベルゼブモン(X抗体)': {'en-JP': 'Beelzebumon (X-Antibody)', 'en-US': 'Beelzemon (X-Antibody)'},
	'ベルゼブモンBM': {'en-JP': 'Beelzebumon BM', 'en-US': 'Beelzemon BM'},
	'ベルゼブモンX抗体': {'en-JP': 'Beelzebumon X-Antibody', 'en-US': 'Beelzemon X-Antibody'},
	'ベルフェモンRM': 'Belphemon RM',
	'ベルフェモンSM': 'Belphemon SM',
	'ベーダモン': 'Vademon',
	'ペイルドラモン': 'Paledramon',
	'ペックモン': 'Peckmon',
	'ホウオウモン': {'en-JP': 'Hououmon', 'en-US': 'Phoenixmon'},
	'ホエーモン': 'Whamon',
	'ホークモン': 'Hawkmon',
	'ホーリーエンジェモン': {'en-JP': 'HolyAngemon', 'en-US': 'MagnaAngemon'},
	'ホーリードラモン': {'en-JP': 'Holydramon', 'en-US': 'Magnadramon'},
	'ボアモン': 'Boarmon',
	'ボタモン': 'Botamon',
	'ボルケーモン': 'Volcamon',
	'ボルトバウタモン': {'en-JP': 'Voltobautamon', 'en-US': 'Boltboutamon'},
	'ボルトモン': 'Boltmon',
	'ボンバーナニモン': 'BomberNanimon',
	'ポヨモン': 'Poyomon',
	'マクラモン': 'Makuramon',
	'マグナガルルモン': 'MagnaGarurumon',
	'マグナガルルモン(分離)': {'en-JP': 'MagnaGarurumon (Detached)', 'en-US': 'MagnaGarurumon (SV)'},
	'マグナモン': 'Magnamon',
	'マグナモン(X抗体)': 'Magnamon (X-Antibody)',
	'マグナモンX抗体': 'Magnamon X-Antibody',
	'マジラモン': 'Majiramon',
	'マスティモン': 'Mastemon',
	'マタドゥルモン': {'en-JP': 'Matadrmon', 'en-US': 'Matadormon'},
	'マッシュモン': {'en-JP': 'Mushmon', 'en-US': 'Mushroomon'},
	'マッハガオガモン': 'MachGaogamon',
	'マミーモン': 'Mummymon',
	'マメモン': 'Mamemon',
	'マリンエンジェモン': {'en-JP': 'MarinAngemon', 'en-US': 'MarineAngemon'},
	'マルスモン': 'Marsmon',
	'ミタマモン': 'Mitamamon',
	'ミネルヴァモン': 'Minervamon',
	'ミヒラモン': 'Mihiramon',
	'ミラージュガオガモン': 'MirageGaogamon',
	'ミラージュガオガモンBM': 'MirageGaogamon BM',
	'ミレニアモン': {'en-JP': 'Millenniumon', 'en-US': 'Millenniummon'},
	'ムゲンドラモン': {'en-JP': 'Mugendramon', 'en-US': 'Machinedramon'},
	'ムンモン': 'Moonmon',
	'ムーチョモン': 'Muchomon',
	'メイクラックモン': {'en-JP': 'Meicrackmon', 'en-US': 'Maycrackmon'},
	'メイクラックモンVM': {'en-JP': 'Meicrackmon VM', 'en-US': 'Maycrackmon VM'},
	'メイクーモン': 'Meicoomon',
	'メガシードラモン': 'MegaSeadramon',
	'メガドラモン': 'Megadramon',
	'メガログラウモン': {'en-JP': 'MegaloGrowmon', 'en-US': 'WarGrowlmon'},
	'メギドラモン': 'Megidramon',
	'メタビー': {'en-US': 'Metabee'},
	'メタリックドラモン': 'Metallicdramon',
	'メタルエテモン': 'MetalEtemon',
	'メタルガルルモン': 'MetalGarurumon',
	'メタルガルルモン(X抗体)': 'MetalGarurumon (X-Antibody)',
	'メタルガルルモン(黒)': 'MetalGarurumon (Black)',
	'メタルガルルモンX抗体': 'MetalGarurumon X-Antibody',
	'メタルグレイモン': 'MetalGreymon',
	'メタルグレイモン(青)': 'MetalGreymon (Blue)',
	// This is just a guess for Alterous Mode
	'メタルグレイモンAM': 'MetalGreymon AM',
	'メタルシードラモン': 'MetalSeadramon',
	'メタルティラノモン': {'en-JP': 'MetalTyranomon', 'en-US': 'MetalTyrannomon'},
	'メタルマメモン': 'MetalMamemon',
	'メフィスモン': {'en-JP': 'Mephismon', 'en-US': 'Mephistomon'},
	'メラモン': 'Meramon',
	'メルクリモン': {'en-JP': 'Mercurymon', 'en-US': 'Merukimon'},
	'モクモン': 'Mokumon',
	'モチモン': {'en-JP': 'Mochimon', 'en-US': 'Motimon'},
	'モノクロモン': 'Monochromon',
	'モノドラモン': 'Monodramon',
	'ヤタガラモン': {'en-JP': 'Yatagaramon', 'en-US': 'Crowmon'},
	'ユキアグモン': {'en-JP': 'YukiAgumon', 'en-US': 'SnowAgumon'},
	'ユキダルモン': {'en-JP': 'Yukidarumon', 'en-US': 'Frigimon'},
	'ユキミボタモン': 'YukimiBotamon',
	'ユニモン': 'Unimon',
	'ユノモン': 'Junomon',
	'ユピテルモン': 'Jupitermon',
	'ユラモン': 'Yuramon',
	'ライズグレイモン': 'RizeGreymon',
	'ライドラモン': {'en-JP': 'Lighdramon', 'en-US': 'Raidramon'},
	'ライラモン': 'Lilamon',
	'ラグエルモン': 'Raguelmon',
	'ラジエルモン': 'Rasielmon',
	'ラストティラノモン': 'RustTyranomon',
	'ラセンモン': 'Rasenmon',
	'ラセンモンGM': 'Rasenmon GM',
	'ラピッドモン': 'Rapidmon',
	'ラフレシモン': 'Rafflesimon',
	'ラブリーエンジェモン': 'LovelyAngemon',
	'ラプタードラモン': 'Raptordramon',
	'ララモン': 'Lalamon',
	'ランクスモン': 'Lynxmon',
	'ラヴォガリータモン': 'Lavogaritamon',
	'ラヴォーボモン': 'Lavorvomon',
	'リュウダモン': 'Ryudamon',
	'リリスモン': 'Lilithmon',
	'リリモン': {'en-JP': 'Lilimon', 'en-US': 'Lillymon'},
	'リヴァイアモン': 'Leviamon',
	'ルナモン': 'Lunamon',
	'ルーチェモン': 'Lucemon',
	'ルーチェモンFM': 'Lucemon FM',
	'ルーチェモンSM': 'Lucemon SM',
	'ルーチェモンラルバ': 'Lucemon Larva',
	'ルーチェモン ラルバ': 'Lucemon Larva',
	'ルーチェモン:ラルバ': 'Lucemon: Larva',
	'レアモン': 'Raremon',
	'レイヴモン': {'en-JP': 'Ravmon', 'en-US': 'Ravemon'},
	'レイヴモンBM': {'en-JP': 'Ravmon BM', 'en-US': 'Ravemon BM'},
	'レオモン': 'Leomon',
	'レキスモン': 'Lekismon',
	'レッパモン': 'Reppamon',
	'レディーデビモン': 'LadyDevimon',
	'レナモン': 'Renamon',
	'ロクショウ': {'en-US': 'Rokusho'},
	'ロコモン': 'Locomon',
	'ロゼモン': 'Rosemon',
	'ロゼモンBM': 'Rosemon BM',
	'ロップモン': 'Lopmon',
	'ロトスモン': {'en-JP': 'Lotusmon', 'en-US': 'Lotosmon'},
	'ローダーレオモン': 'LoaderLeomon',
	'ロードナイトモン': {'en-JP': 'LordKnightmon', 'en-US': 'Crusadermon'},
	'ロードナイトモン(X抗体)': {'en-JP': 'LordKnightmon (X-Antibody)', 'en-US': 'Crusadermon (X-Antibody)'},
	'ロードナイトモンNX': {'en-JP': 'LordKnightmon NX', 'en-US': 'Crusadermon NX'},
	'ロードナイトモンX抗体': {'en-JP': 'LordKnightmon X-Antibody', 'en-US': 'Crusadermon X-Antibody'},
	'ワイズモン': 'Wisemon',
	'ワスプモン': 'Waspmon',
	'ワニャモン': 'Wanyamon',
	'ワルもんざえモン': 'WaruMonzaemon',
	'ワルシードラモン': 'WaruSeadramon',
	'ワーガルルモン': 'WereGarurumon',
	'ワーガルルモン(黒)': 'WereGarurumon (Black)',
	'ワームモン': 'Wormmon',
	'ヴァイクモン': 'Vikemon',
	'ヴァジラモン': 'Vajramon',
	'ヴァルキリモン': 'Valkyrimon',
	'ヴァロドゥルモン': {'en-JP': 'Valdurmon', 'en-US': 'Varodurumon'},
	'ヴァンデモン': {'en-JP': 'Vamdemon', 'en-US': 'Myotismon'},
	'ヴィカラーラモン': 'Vikaralamon',
	'ヴェノムヴァンデモン': {'en-JP': 'VenomVamdemon', 'en-US': 'VenomMyotismon'},
	'ヴォルケニックドラモン': 'Volcanicdramon',
	'ヴォルフモン': {'en-JP': 'Wolfmon', 'en-US': 'Lobomon'},
	'ヴォーボモン': 'Vorvomon',
	'ヴリトラモン': {'en-JP': 'Vritramon', 'en-US': 'BurningGreymon'},
}

const _alternativeNames: { readonly [jaName: string]: readonly string[] } = {
	'アイスデビモン': ['IceWingmon'],
	'アグモン 勇気の絆': ["Agumon -Yuki's Kizuna-"],
	'アグモン(黒)': ['BlackAgumon', 'ブラックアグモン', 'クロアグモン'],
	'アポカリモン': ['Apoclymon'],
	'アルカディモン': ['Arukadhimon'],
	'アルカディモン(完全体)': ['Arukadhimon (Ultimate)'],
	'アルカディモン(幼年期)': ['Arukadhimon (In-Training)'],
	'アルカディモン(成熟期)': ['Arukadhimon (Champion)'],
	'アルカディモン(成長期)': ['Arukadhimon (Rookie)'],
	'アルカディモン(究極体)': ['Arukadhimon (Mega)'],
	'アルカディモン(超究極体)': ['Arukadhimon (Ultra)'],
	'アルカディモン完全体': ['Arukadhimon Ultimate'],
	'アルカディモン幼年期': ['Arukadhimon In-Training'],
	'アルカディモン成熟期': ['Arukadhimon Champion'],
	'アルカディモン成長期': ['Arukadhimon Rookie'],
	'アルカディモン究極体': ['Arukadhimon Mega'],
	'アルカディモン超究極体': ['Arukadhimon Ultra'],
	'アルファモン王竜剣': ['アルファモン：王竜剣'],  // FIXME: perhaps this should be a nickname? (same for Lucemon Larva and Gaioumon IM)
	'アルフォースブイドラモンFM': ['アルフォースブイドラモン超究極体', 'UlforceVdramon: Future Mode', 'UlforceVeedramon: Future Mode'],
	'アンティラモン': ['Andiramon (Deva)', 'Antylamon (Good)', 'アンティラモン(デーヴァ)'],
	'インペリアルドラモンDM': ['インペリアルドラモン：ドラゴンモード', 'Imperialdramon: Dragon Mode'],
	'インペリアルドラモンFM': ['インペリアルドラモン：ファイターモード', 'Imperialdramon: Fighter Mode'],
	'インペリアルドラモンPM': ['インペリアルドラモン：パラディンモード', 'Imperialdramon: Paladin Mode'],
	'エアロブイドラモン': ['AeroV-dramon'],
	'エレキモン(紫)': ['Vi-Elecmon', 'Elecmon Vi', 'エレキモンVi'],
	'エンシェントトロイアモン': ['AncientTroymon'],
	'エンシェントボルケーモン': ['Volcanomon'],
	'オウリュウモン': ['Goldragomon', 'OuRyuumon', 'Owryumon'],
	'オファニモンFM': ['オファニモン：フォールダウンモード', 'Ofanimon: Falldown Mode', 'Ophanimon: Falldown Mode'],
	'オメガモン': ['Omnimon'],
	'オメガモンMM': ['Omnimon MM', 'オメガモン：マーシフルモード', 'Omegamon: Merciful Mode', 'Omnimon: Merciful Mode'],
	'オメガモンNX': ['Omnimon NX'],
	'オメガモンズワルト': ['Omnimon Zwart'],
	'オメガモンズワルトD': ['オメガモンズワルトDEFEAT', 'オメガモンズワルトデフィート', 'Omegamon Zwart Defeat'],
	'カイゼルグレイモン': ['EmperorGreymon'],
	'カオスモンVA': ['カオスモン：ヴァロドゥルアーム', 'Chaosmon: Valdur Arm'],
	'ガイオウモン': ['Samudramon'],
	'ガイオウモン厳刀ノ型': ['ガイオウモン：厳刀ノ型', 'ガイオウモン 厳刀の型'],
	'ガブモン 友情の絆': ["Gabumon -Yujo's Kizuna-"],
	'ガブモン(黒)': ['BlackGabumon', 'ブラックガブモン'],
	'ガルムモン': ['BladeGarurumon', 'ブラックガルルモン'],
	'ガルルモン(黒)': ['BlackGarurumon'],
	'キョキョモン': ['Kyokomon'],
	'ギンリュウモン': ['Sildragomon'],
	'クズハモンMM': ['クズハモン：巫女モード', 'Kuzuhamon: Miko Mode'],
	'クリサリモン': ['Kurisarimon'],
	'グランドロコモン': ['GranLocomon'],
	'グリズモン': ['Grizzmon'],
	'グリフォモン': ['Gryphomon'],
	'グレイモン(青)': ['Greymon (Black)', 'BlackGreymon', 'ブラックグレイモン', 'グレイモンB'],
	'ケルビモン': ['Kerpymon'],
	'ケルビモン(善)': ['Kerpymon (Good)'],
	'ケルビモン(悪)': ['Kerpymon (Black)'],
	'サクヤモンMM': ['サクヤモン：巫女モード', 'Sakuyamon: Miko Mode', 'サクヤモン(巫女形態)', 'サクヤモン(巫女)', 'Maid Mode Sakuyamon', 'Sakuyamon (Miko)'],
	'シェンウーモン': ['Ebonwumon'],
	'セーバードラモン': ['Sabirdramon'],
	'ソーサリモン': ['Sorcerymon', 'Socerimon'],
	'ツチダルモン': ['Chuchidarumon', 'Tsuchidarumon'],
	'デクスドルガモン': ['Deaxdolgamon'],
	'デクスドルグレモン': ['Deaxdolgremon'],
	'デクスドルゴラモン': ['デクルドルゴラモン', 'Deaxdolgoramon', 'DexDorgoramon'],
	'デクスモン': ['Deaxmon'],
	'デーモン': ['Daemon'],
	'トイアグモン(黒)': ['ShadowToyAgumon', 'トイアグモン クロ', 'トイアグモンL'],
	'トゥルイエモン': ['Truiemon'],
	'ドラクモン': ['Dracomon'],
	'ドルガモン': ['Dolgamon'],
	'ドルグレモン': ['Dolguremon'],
	'ドルゴラモン': ['Dolgoramon'],
	'ドルモン': ['Dolmon'],
	'ネプトゥーンモン': ['Neptunmon', 'Nepmon'],
	'パイルボルケーモン': ['PileVolcanomon', 'Pail Volcanomon'],
	'ヒシャリュウモン': ['Hisyarumon', 'Flydragomon'],
	'ヒポグリフォモン': ['Hyppogryphomon'],
	'ファンロンモン': ['Fanglongmon'],
	'ブルコモン': ['Bulcomon'],
	'ブレイクドラモン': ['Brakedramon'],
	'プラチナスカモン': ['P-Sukamon'],
	'ホエーモン': ['ホエーモン(完全体)', 'Whamon (Perfect)', 'Whamon (Ultimate)'],
	'ボルケーモン': ['Volcanomon'],
	'マタドゥルモン': ['Matadoramon', 'Matadramon'],
	'マルスモン': ['Marusumon'],
	'メイクーモン': ['Meikumon'],
	'メタルガルルモン(黒)': ['BlackMetalGarurumon', 'ブラックメタルガルルモン'],
	'メタルグレイモン': ['メタルグレイモン(ワクチン種)', 'MetalGreymon (Vaccine)', '真メタルグレイモン', 'RealMetalGreymon'],
	'メタルグレイモン(青)': ['MetalGreymon (Black)', 'MetalGreymon (Virus)', 'BlackMetalGreymon', 'メタルグレイモン(ウィルス種)', 'メタルグレイモンER', 'メタルグレイモンL', 'MetalGreymon Virus Species'],
	'メタルグレイモンAM': ['メタルグレイモン：アルタラウスモード', 'MetalGreymon: Alterous Mode', 'MetalGreymon: Alteros Mode'],
	'メルクリモン': ['Mercurimon', 'Mercuremon'],
	'ラセンモンGM': ['ラセンモン：激昂モード', 'Rasenmon: Gekkou Mode', 'Rasenmon: Fury Mode'],
	'ラプタードラモン': ['Reptiledramon'],
	'ラヴォーボモン': ['Lavobomon'],
	'リリモン': ['Lilymon'],
	'ルーチェモンFM': ['Lucemon CM'],
	'ルーチェモンラルバ': ['ルーチェモン：ラルバ'],
	'ローダーレオモン': ['LoaderLiomon'],
	'ロードナイトモン': ['LoadKnightmon', 'RoadKnightmon'],
	'ワーガルルモン(黒)': ['BlackWereGarurumon', 'ShadowWereGarurumon', 'ブラックワーガルルモン'],
	'ヴァジラモン': ['Varjamon'],
	'ヴォーボモン': ['Vobomon'],
}

const _nicknames: { readonly [jaName: string]: readonly string[] } = {
	'アグモン 勇気の絆': ['Agumon (Bond of Courage)', 'Aguman', 'Agubond', 'AguJoJo', 'Agujoni', 'Agujobroni'],
	'アグモン -勇気の絆-': ['Agumon (Bond of Courage)', 'Aguman', 'Agubond', 'AguJoJo', 'Agujoni', 'Agujobroni'],
	'アンティラモン': ['Antylamon (Deva)', 'Andiramon (Good)', 'Andiramon (Data)', 'Antylamon (Data)'],
	'アルゴモン(幼年期I)': ['Argomon (Fresh)'],
	'アルゴモン(幼年期II)': ['Argomon (In-Training)'],
	'アルゴモン幼年期I': ['Argomon Fresh'],
	'アルゴモン幼年期II': ['Argomon In-Training'],
	'アルフォースブイドラモン': ['UlforceV-dramon'],
	'アルフォースブイドラモンFM': ['アルフォースブイドラモン(超究極体)', 'アルフォースブイドラモン：フューチャーモード', 'UlforceV-dramon: Future Mode', 'UlforceV-dramon Super Ultimate'],
	'ウォーグレイモン': ['WG', 'WGm'],
	'ウォーグレイモン(X抗体)': ['WGX', 'WGmX'],
	'ウォーグレイモンX抗体': ['WGX', 'WGmX'],
	'エレキモン(紫)': ['Elecmon (Virus)'],
	'オメガモンMM': ['OMM'],
	// ガイオウモンIM used in ReArise internal filenames but not anywhere user-facing, so I say it's not official enough
	// Samudramon Itto Mode is used by digimon.fandom.com
	// The kana variants are just my own attempt to help people
	'ガイオウモン厳刀ノ型': ['Gaioumon Ittou-no-Kata', 'Gaiomon Itto-no-Kata', 'Samudramon Itto Mode', 'Gaioumon Ittou Mode', 'Gaiomon Ittou Mode', 'ガイオウモンIM', 'Gaioumon IM', 'Gaiomon IM', 'Samudramon IM', 'ガイオウモン 一刀ノ型', 'ガイオウモン 一刀の型', 'ガイオウモン いっとうノ型', 'ガイオウモン いっとうの型', 'ガイオウモン いっとうのかた', 'ガイオウモン いっとうのカタ', 'ガイオウモン いっとうノかた', 'ガイオウモン いっとうノカタ', 'ガイオウモン イットウノ型', 'ガイオウモン イットウの型', 'ガイオウモン イットウのかた', 'ガイオウモン イットウノかた', 'ガイオウモン イットウのカタ', 'ガイオウモン イットウノカタ'],
	'ガブモン 友情の絆': ['Gabuman', 'Gabubond', 'GabuJoJo', 'Gabujoni', 'Gabujobroni'],
	'ガブモン -友情の絆-': ['Gabuman', 'Gabubond', 'GabuJoJo', 'Gabujoni', 'Gabujobroni'],
	'ガルムモン': ['Garmmon'],
	'クズハモン': ['Kazuhamon', 'Kazuyamon'],
	// Maid Mode used in ReArise in-game news but not anywhere else, so I say it's not official enough
	// TODO this name set can be simplified depending on autocompletion
	'クズハモンMM': ['Kuzuhamon Maid Mode', 'Kuzuhamon Maiden Mode', 'Maid Mode Kuzuhamon', 'Kazuhamon MM', 'Kazuhamon Miko Mode', 'Kazuhamon Maid Mode', 'Kazuhamon Maiden Mode', 'Maid Mode Kazuhamon', 'Kazuyamon MM', 'Kazuyamon Miko Mode', 'Kazuyamon Maid Mode', 'Kazuyamon Maiden Mode', 'Maid Mode Kazuyamon'],
	'グレイモン(青)': ['Greymon (Virus)'],
	'ケルビモン(善)': ['Kerpymon (White)'],
	'ケルビモン(悪)': ['Kerpymon (Evil)'],
	// Maid Mode used in ReArise in-game news but not anywhere else, so I say it's not official enough
	'サクヤモンMM': ['Sakuyamon Maid Mode', 'Sakuyamon Maiden Mode'],
	'シャッコウモン': ['Teapotmon'],
	'スカルサタモン': ['SkullSarahmon'],
	'セイバーハックモン': ['SaviourHuckmon', 'SaviourHackmon'],
	'トイアグモン(黒)': ['BlackToyAgumon'],
	'ピッコロモン': ['Piccolomon'],
	'ブルコモン': ['Blucomon'],
	'プラチナスカモン': ['PlatinumScumon'],
	'メイクーモン': ['Maycoomon'],
	'メタルガルルモン': ['MG', 'MGm'],
	'メタルガルルモンX抗体': ['MGX', 'MGmX'],
	'メタルガルルモン(X抗体)': ['MGX', 'MGmX'],
	'ロードナイトモン': ['Rhodonitemon'],
}

function enNameFromJa(jaName: string): { [LT in EnglishLanguageTag]?: string } | undefined {
	jaName = jaName.normalize('NFKC').replace(/’/g, "'")
	const enSuffixes: { [LT in EnglishLanguageTag]: string[] } = {'en-JP': [], 'en-US': []}
translateName:
	for (;;) {
		let enName = englishNames[jaName]
		if (enName) {
			if (typeof enName === 'string')
				enName = {'en-JP': enName, 'en-US': enName}
			const enNameWithSuffix: { [LT in EnglishLanguageTag]?: string } = {}
			if ('en-JP' in enName)
				enNameWithSuffix['en-JP'] = enName['en-JP'] + enSuffixes['en-JP'].reverse().join('')
			if ('en-US' in enName)
				enNameWithSuffix['en-US'] = enName['en-US'] + enSuffixes['en-US'].reverse().join('')
			return enNameWithSuffix
		}

		for (let [jaSuffix, enSuffix] of Object.entries(englishSuffixes)) {
			if (jaName.endsWith(jaSuffix)) {
				if (typeof enSuffix === 'string')
					enSuffix = {'en-JP': enSuffix, 'en-US': enSuffix}
				enSuffixes['en-JP'].push(enSuffix['en-JP'])
				enSuffixes['en-US'].push(enSuffix['en-US'])
				jaName = jaName.slice(0, -jaSuffix.length)
				continue translateName
			}
		}
		return
	}
}

export function synthesizeEnName(name: InternationalizedString): void {
	const jaName = name.ja
	if (jaName == null)
		return
	const enName = enNameFromJa(jaName)
	if (enName) {
		if (!('en-JP' in name) && 'en-JP' in enName)
			name['en-JP'] = enName['en-JP']
		if (!('en-US' in name) && 'en-US' in enName)
			name['en-US'] = enName['en-US']
	}
}

export function localize(string: InternationalizedString, lang: LanguageTag): [string] | [string, OutputLanguageTag] {
	let value = string[lang]
	if (value != null)
		return [value]
	value = string['en-US']
	if (value != null)
		return [value, value === string['en-JP'] ? 'en' : 'en-US']
	for (const key of ['en-JP', 'ja', 'ko', 'zh-TW'] as const) {
		value = string[key]
		if (value != null)
			return [value, key]
	}
	return ['???']
}

export function compactInternationalizedString(string: InternationalizedString): CompactInternationalizedString {
	let compact = [string.ja ?? null]
	const {'en-JP': enJP, 'en-US': enUS, ko, 'zh-TW': zh} = string
	if (enJP !== undefined || enUS !== undefined || ko !== undefined || zh !== undefined) {
		compact.push(enJP ?? null)
		if (enJP !== enUS)
			compact.push(enUS ?? null)
		if (ko !== undefined || zh !== undefined) {
			compact.push(ko ?? null)
			compact.push(zh ?? null)
		}
	}
	return compact
}

export function unpackInternationalizedString(string: CompactInternationalizedString | InternationalizedString): InternationalizedString
export function unpackInternationalizedString(string: null): null
export function unpackInternationalizedString(string: CompactInternationalizedString | InternationalizedString | null): InternationalizedString | null
export function unpackInternationalizedString(string: CompactInternationalizedString | InternationalizedString | null): InternationalizedString | null {
	if (!(string instanceof Array))
		return string
	let unpacked: InternationalizedString = {}
	if (string[0] != null)
		unpacked.ja = string[0]
	if (string[1] != null)
		unpacked['en-JP'] = string[1]
	const enUS = string[1 + +(string.length === 3 || string.length === 5)]
	if (enUS != null)
		unpacked['en-US'] = enUS
	if (string.length > 3) {
		const ko = string[string.length - 2]
		if (ko != null)
			unpacked.ko = ko
		const zh = string[string.length - 1]
		if (zh != null)
			unpacked['zh-TW'] = zh
	}
	return unpacked
}
