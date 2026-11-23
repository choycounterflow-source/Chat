export type ColorThemeId = 'forest' | 'ocean' | 'sunset' | 'royal';

export interface ThemePreset {
  id: ColorThemeId;
  name: string;
  subtitle: string;
  metaLight: string;
  metaDark: string;
  swatchGradient: string;
  swatchAccentDot: string;
  previewHeaderBar: string;
  previewBubbleMe: string;
  previewBubbleOther: string;
  // Shell & Sidebar
  appShellBg: string;
  sidebarBg: string;
  sidebarBrandBorder: string;
  sidebarTitleText: string;
  sidebarSubText: string;
  navActive: string;
  navInactive: string;
  sidebarFooterBorder: string;
  sidebarCard: string;
  sidebarMutedText: string;
  // Top Header & Hero Banner
  topHeaderBg: string;
  heroCard: string;
  heroGlowA: string;
  heroGlowB: string;
  heroCorner: string;
  heroWingLeft: string;
  heroWingRight: string;
  heroGem: string;
  heroWordmark: string;
  heroSubtitleRow: string;
  heroSubtitleLineLeft: string;
  heroSubtitleLineRight: string;
  searchIcon: string;
  searchInput: string;
  searchButton: string;
  // Menu & Settings Drawer
  drawerAside: string;
  drawerHeader: string;
  drawerHeaderIcon: string;
  drawerHeaderTitle: string;
  drawerCloseBtn: string;
  drawerSectionCard: string;
  drawerSectionBorder: string;
  drawerPrimaryBtn: string;
  drawerSegmentedActive: string;
  drawerSegmentedInactive: string;
  drawerSwitchTrackOn: string;
  drawerSwitchTrackOff: string;
  // Messages Header, Room List & Chat Bubbles
  messagesPanelCard: string;
  chatHeaderDefault: string;
  chatHeaderSubtleHover: string;
  chatHeaderBackBtn: string;
  chatRoomActive: string;
  chatRoomInactive: string;
  chatAccentBtn: string;
  chatSecondaryBtn: string;
  chatActivePill: string;
  chatBodyDefaultBg: string;
  chatBubbleMeDefault: string;
  chatBubbleOtherDefault: string;
  chatBubbleMeMeta: string;
  chatBubbleOtherMeta: string;
  chatBubbleMeAudioBox: string;
  chatBubbleOtherAudioBox: string;
  chatBubbleMeAudioLabel: string;
  chatBubbleOtherAudioLabel: string;
  chatBubbleMeAudioText: string;
  chatBubbleOtherAudioText: string;
  chatBubbleMeFileText: string;
  chatBubbleOtherFileText: string;
  chatBubbleMeReactionChip: string;
  chatBubbleOtherReactionChip: string;
  chatComposerBarDefault: string;
  chatComposerBoxDefault: string;
  chatComposerDividerDefault: string;
  chatComposerIconDefault: string;
  chatSearchInputDefault: string;
  // Secondary Headers & Accents
  feedTabActive: string;
  liveBannerBorder: string;
  headBubbleBorder: string;
}

export const THEME_PRESETS: Record<ColorThemeId, ThemePreset> = {
  forest: {
    id: 'forest',
    name: 'Forest',
    subtitle: 'Emerald & Gold',
    metaLight: '#ecfdf5',
    metaDark: '#022c22',
    swatchGradient: 'from-emerald-500 to-teal-600',
    swatchAccentDot: 'bg-amber-400',
    previewHeaderBar: 'from-emerald-500 via-teal-500 to-amber-400',
    previewBubbleMe: 'bg-gradient-to-r from-emerald-500 to-teal-600',
    previewBubbleOther: 'bg-emerald-200 dark:bg-emerald-800',
    appShellBg: 'bg-emerald-50 dark:bg-emerald-950/95 text-emerald-950 dark:text-slate-100',
    sidebarBg: 'bg-white/95 dark:bg-emerald-900/90 border-emerald-200 dark:border-emerald-800',
    sidebarBrandBorder: 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950',
    sidebarTitleText: 'text-emerald-950 dark:text-white',
    sidebarSubText: 'text-emerald-700 dark:text-emerald-300',
    navActive: 'bg-emerald-400 text-slate-950 font-bold shadow-xs',
    navInactive: 'text-emerald-800 hover:bg-emerald-100 dark:text-emerald-100 dark:hover:bg-emerald-800',
    sidebarFooterBorder: 'border-emerald-200 dark:border-emerald-800',
    sidebarCard: 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-800/70',
    sidebarMutedText: 'text-emerald-700 dark:text-emerald-300',
    topHeaderBg: 'border-emerald-200 dark:border-emerald-700/70 bg-gradient-to-b from-white via-emerald-50/70 to-emerald-50 dark:from-emerald-950 dark:via-emerald-900/70 dark:to-emerald-950/90',
    heroCard: 'border-amber-500/50 dark:border-amber-400/45 bg-gradient-to-r from-emerald-100 via-white to-emerald-100 dark:from-emerald-950 dark:via-emerald-900/95 dark:to-emerald-950 shadow-[0_4px_20px_rgba(6,95,70,0.12)] dark:shadow-[0_0_25px_rgba(16,185,129,0.22)]',
    heroGlowA: 'bg-amber-400/20 dark:bg-amber-400/15',
    heroGlowB: 'bg-emerald-400/20',
    heroCorner: 'border-amber-600/70 dark:border-amber-300/80',
    heroWingLeft: 'from-transparent via-amber-500/80 dark:via-amber-400/80 to-emerald-600 dark:to-emerald-300',
    heroWingRight: 'from-transparent via-amber-500/80 dark:via-amber-400/80 to-emerald-600 dark:to-emerald-300',
    heroGem: 'bg-amber-500 dark:bg-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.7)]',
    heroWordmark: 'from-emerald-950 via-emerald-700 via-50% to-amber-700 dark:from-amber-200 dark:via-white dark:via-50% dark:to-emerald-300 drop-shadow-[0_2px_10px_rgba(16,185,129,0.2)] dark:drop-shadow-[0_3px_14px_rgba(251,191,36,0.4)]',
    heroSubtitleRow: 'text-amber-800/90 dark:text-amber-200/85',
    heroSubtitleLineLeft: 'to-amber-600/60 dark:to-amber-300/70',
    heroSubtitleLineRight: 'to-amber-600/60 dark:to-amber-300/70',
    searchIcon: 'text-emerald-700 dark:text-emerald-300',
    searchInput: 'bg-white dark:bg-emerald-950 border-emerald-300 dark:border-emerald-700/80 text-emerald-950 dark:text-white placeholder-emerald-600/60 dark:placeholder-emerald-400 focus:border-amber-500 dark:focus:border-amber-300/80',
    searchButton: 'bg-white dark:bg-emerald-900 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100 hover:bg-emerald-100 dark:hover:bg-emerald-800 hover:border-amber-400/70',
    drawerAside: 'bg-white dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800',
    drawerHeader: 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/85 dark:bg-emerald-900/70',
    drawerHeaderIcon: 'text-emerald-700 dark:text-emerald-300',
    drawerHeaderTitle: 'text-emerald-950 dark:text-white',
    drawerCloseBtn: 'bg-white dark:bg-emerald-950 border-emerald-200 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-800',
    drawerSectionCard: 'bg-emerald-50/70 dark:bg-emerald-900/40 border-emerald-200 dark:border-emerald-800',
    drawerSectionBorder: 'border-emerald-200 dark:border-emerald-800',
    drawerPrimaryBtn: 'bg-emerald-500 hover:bg-emerald-400 text-slate-950',
    drawerSegmentedActive: 'bg-emerald-600 text-white dark:bg-emerald-400 dark:text-slate-950 shadow-xs',
    drawerSegmentedInactive: 'text-emerald-800 hover:bg-emerald-100 dark:text-emerald-200 dark:hover:bg-emerald-900',
    drawerSwitchTrackOn: 'bg-emerald-400 border-emerald-300',
    drawerSwitchTrackOff: 'bg-emerald-200 border-emerald-300',
    messagesPanelCard: 'bg-white dark:bg-emerald-900/60 border-emerald-200 dark:border-emerald-700/50',
    chatHeaderDefault: 'border-emerald-200 dark:border-emerald-800 bg-gradient-to-r from-emerald-50/95 via-white to-teal-50/90 dark:from-emerald-950 dark:via-emerald-900/90 dark:to-teal-950/90 text-emerald-950 dark:text-white',
    chatHeaderSubtleHover: 'hover:bg-emerald-100/80 dark:hover:bg-emerald-800/60',
    chatHeaderBackBtn: 'bg-emerald-100 dark:bg-emerald-900 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100 hover:bg-emerald-200 dark:hover:bg-emerald-800',
    chatRoomActive: 'bg-emerald-200/90 dark:bg-emerald-800 text-emerald-950 dark:text-white border-2 border-emerald-500 dark:border-amber-400 font-bold shadow-md',
    chatRoomInactive: 'bg-emerald-50/80 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-800',
    chatAccentBtn: 'bg-emerald-500 hover:bg-emerald-400 dark:bg-emerald-400 dark:hover:bg-emerald-300 text-white dark:text-slate-950 font-bold',
    chatSecondaryBtn: 'bg-emerald-100/80 dark:bg-emerald-900 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 hover:text-emerald-950 dark:hover:text-white',
    chatActivePill: 'bg-emerald-400 text-slate-950 shadow-2xs',
    chatBodyDefaultBg: 'bg-gradient-to-b from-emerald-50/40 via-white to-teal-50/40 dark:from-emerald-950/50 dark:via-emerald-950/80 dark:to-teal-950/60',
    chatBubbleMeDefault: 'bg-gradient-to-br from-emerald-500 to-teal-600 dark:from-emerald-600 dark:to-teal-700 text-white border border-emerald-400/70 dark:border-emerald-400/40 shadow-sm',
    chatBubbleOtherDefault: 'bg-emerald-50 dark:bg-emerald-900/85 text-emerald-950 dark:text-slate-100 border border-emerald-200 dark:border-emerald-700/70 shadow-2xs',
    chatBubbleMeMeta: 'text-emerald-700 dark:text-emerald-300',
    chatBubbleOtherMeta: 'text-emerald-700 dark:text-emerald-300',
    chatBubbleMeAudioBox: 'bg-black/15 border-white/25 text-white',
    chatBubbleOtherAudioBox: 'bg-white/85 dark:bg-emerald-950/80 border-emerald-300/70 dark:border-emerald-700/70 text-emerald-950 dark:text-emerald-100',
    chatBubbleMeAudioLabel: 'text-emerald-100',
    chatBubbleOtherAudioLabel: 'text-emerald-700 dark:text-emerald-300',
    chatBubbleMeAudioText: 'text-white',
    chatBubbleOtherAudioText: 'text-emerald-950 dark:text-slate-100',
    chatBubbleMeFileText: 'text-amber-100',
    chatBubbleOtherFileText: 'text-amber-700 dark:text-amber-300',
    chatBubbleMeReactionChip: 'bg-white/20 text-white border-white/30',
    chatBubbleOtherReactionChip: 'bg-white dark:bg-emerald-950 text-emerald-950 dark:text-white border-emerald-300 dark:border-emerald-700',
    chatComposerBarDefault: 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950',
    chatComposerBoxDefault: 'bg-white dark:bg-emerald-900 border-emerald-300 dark:border-emerald-700 focus-within:border-emerald-500 dark:focus-within:border-amber-300/80',
    chatComposerDividerDefault: 'border-emerald-200/80 dark:border-emerald-800/80 bg-emerald-50/60 dark:bg-emerald-950/35',
    chatComposerIconDefault: 'text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200/70 dark:hover:bg-emerald-800',
    chatSearchInputDefault: 'bg-emerald-50 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-white placeholder-emerald-600/60 dark:placeholder-emerald-400 focus:border-emerald-500',
    feedTabActive: 'bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 font-extrabold shadow-md',
    liveBannerBorder: 'border-emerald-400',
    headBubbleBorder: 'border-emerald-400',
  },

  ocean: {
    id: 'ocean',
    name: 'Ocean',
    subtitle: 'Sky & Deep Blue',
    metaLight: '#f0f9ff',
    metaDark: '#082f49',
    swatchGradient: 'from-sky-400 to-blue-600',
    swatchAccentDot: 'bg-cyan-300',
    previewHeaderBar: 'from-sky-500 via-cyan-500 to-blue-600',
    previewBubbleMe: 'bg-gradient-to-r from-sky-500 to-blue-600',
    previewBubbleOther: 'bg-sky-200 dark:bg-sky-800',
    appShellBg: 'bg-sky-50 dark:bg-slate-950 text-slate-900 dark:text-sky-50',
    sidebarBg: 'bg-white/95 dark:bg-sky-950/95 border-sky-200 dark:border-sky-800/80',
    sidebarBrandBorder: 'border-sky-400 bg-sky-50 dark:bg-sky-950',
    sidebarTitleText: 'text-sky-950 dark:text-white',
    sidebarSubText: 'text-sky-700 dark:text-sky-300',
    navActive: 'bg-gradient-to-r from-sky-400 to-cyan-400 text-slate-950 font-bold shadow-xs',
    navInactive: 'text-sky-900 hover:bg-sky-100 dark:text-sky-100 dark:hover:bg-sky-900/80',
    sidebarFooterBorder: 'border-sky-200 dark:border-sky-800',
    sidebarCard: 'bg-sky-50 dark:bg-sky-900/50 border-sky-200 dark:border-sky-800 hover:bg-sky-100 dark:hover:bg-sky-800/70',
    sidebarMutedText: 'text-sky-700 dark:text-sky-300',
    topHeaderBg: 'border-sky-200 dark:border-sky-800/80 bg-gradient-to-b from-white via-sky-50/80 to-cyan-50/70 dark:from-slate-950 dark:via-sky-950/90 dark:to-slate-950',
    heroCard: 'border-sky-400/60 dark:border-cyan-400/45 bg-gradient-to-r from-sky-100 via-white to-cyan-100 dark:from-slate-950 dark:via-sky-900/90 dark:to-blue-950 shadow-[0_4px_20px_rgba(2,132,199,0.14)] dark:shadow-[0_0_25px_rgba(56,189,248,0.22)]',
    heroGlowA: 'bg-cyan-400/25 dark:bg-cyan-400/15',
    heroGlowB: 'bg-blue-400/20',
    heroCorner: 'border-sky-600/75 dark:border-cyan-300/80',
    heroWingLeft: 'from-transparent via-cyan-500/80 dark:via-cyan-400/80 to-blue-600 dark:to-sky-300',
    heroWingRight: 'from-transparent via-cyan-500/80 dark:via-cyan-400/80 to-blue-600 dark:to-sky-300',
    heroGem: 'bg-cyan-500 dark:bg-cyan-300 shadow-[0_0_8px_rgba(34,211,238,0.75)]',
    heroWordmark: 'from-sky-950 via-blue-700 via-50% to-cyan-600 dark:from-cyan-200 dark:via-white dark:via-50% dark:to-sky-300 drop-shadow-[0_2px_10px_rgba(14,165,233,0.22)] dark:drop-shadow-[0_3px_14px_rgba(56,189,248,0.4)]',
    heroSubtitleRow: 'text-sky-800/90 dark:text-cyan-200/85',
    heroSubtitleLineLeft: 'to-sky-500/60 dark:to-cyan-300/70',
    heroSubtitleLineRight: 'to-sky-500/60 dark:to-cyan-300/70',
    searchIcon: 'text-sky-700 dark:text-sky-300',
    searchInput: 'bg-white dark:bg-sky-950 border-sky-300 dark:border-sky-700/80 text-sky-950 dark:text-white placeholder-sky-600/60 dark:placeholder-sky-400 focus:border-cyan-500 dark:focus:border-cyan-300/80',
    searchButton: 'bg-white dark:bg-sky-900 border-sky-300 dark:border-sky-700 text-sky-900 dark:text-sky-100 hover:bg-sky-100 dark:hover:bg-sky-800 hover:border-cyan-400/70',
    drawerAside: 'bg-white dark:bg-slate-950 border-sky-200 dark:border-sky-800',
    drawerHeader: 'border-sky-200 dark:border-sky-800 bg-gradient-to-r from-sky-100/90 to-cyan-50/90 dark:from-sky-950 dark:to-blue-950',
    drawerHeaderIcon: 'text-sky-700 dark:text-cyan-300',
    drawerHeaderTitle: 'text-sky-950 dark:text-white',
    drawerCloseBtn: 'bg-white dark:bg-sky-950 border-sky-200 dark:border-sky-700 text-sky-800 dark:text-sky-200 hover:bg-sky-100 dark:hover:bg-sky-800',
    drawerSectionCard: 'bg-sky-50/75 dark:bg-sky-950/60 border-sky-200 dark:border-sky-800',
    drawerSectionBorder: 'border-sky-200 dark:border-sky-800',
    drawerPrimaryBtn: 'bg-sky-500 hover:bg-sky-400 text-white dark:text-slate-950',
    drawerSegmentedActive: 'bg-sky-600 text-white dark:bg-sky-400 dark:text-slate-950 shadow-xs',
    drawerSegmentedInactive: 'text-sky-800 hover:bg-sky-100 dark:text-sky-200 dark:hover:bg-sky-900',
    drawerSwitchTrackOn: 'bg-sky-400 border-sky-300',
    drawerSwitchTrackOff: 'bg-sky-200 border-sky-300',
    messagesPanelCard: 'bg-white dark:bg-sky-950/65 border-sky-200 dark:border-sky-800/70',
    chatHeaderDefault: 'border-sky-200 dark:border-sky-800 bg-gradient-to-r from-sky-100/90 via-white to-cyan-100/80 dark:from-slate-950 dark:via-sky-900/90 dark:to-blue-950/90 text-sky-950 dark:text-white',
    chatHeaderSubtleHover: 'hover:bg-sky-100/80 dark:hover:bg-sky-800/60',
    chatHeaderBackBtn: 'bg-sky-100 dark:bg-sky-900 border-sky-300 dark:border-sky-700 text-sky-900 dark:text-sky-100 hover:bg-sky-200 dark:hover:bg-sky-800',
    chatRoomActive: 'bg-sky-200/90 dark:bg-sky-800 text-sky-950 dark:text-white border-2 border-sky-500 dark:border-cyan-400 font-bold shadow-md',
    chatRoomInactive: 'bg-sky-50/80 dark:bg-sky-950 text-sky-900 dark:text-sky-200 border border-sky-200 dark:border-sky-800 hover:bg-sky-100 dark:hover:bg-sky-800',
    chatAccentBtn: 'bg-sky-500 hover:bg-sky-400 dark:bg-sky-400 dark:hover:bg-cyan-300 text-white dark:text-slate-950 font-bold',
    chatSecondaryBtn: 'bg-sky-100/85 dark:bg-sky-900 border-sky-300 dark:border-sky-700 text-sky-800 dark:text-sky-200 hover:text-sky-950 dark:hover:text-white',
    chatActivePill: 'bg-sky-400 text-slate-950 shadow-2xs',
    chatBodyDefaultBg: 'bg-gradient-to-b from-sky-50/65 via-white to-cyan-50/55 dark:from-slate-950/80 dark:via-sky-950/75 dark:to-blue-950/60',
    chatBubbleMeDefault: 'bg-gradient-to-br from-sky-500 to-blue-600 dark:from-sky-500 dark:to-blue-700 text-white border border-sky-400/70 dark:border-cyan-400/40 shadow-sm',
    chatBubbleOtherDefault: 'bg-sky-50 dark:bg-sky-900/85 text-sky-950 dark:text-sky-50 border border-sky-200 dark:border-sky-700/75 shadow-2xs',
    chatBubbleMeMeta: 'text-sky-700 dark:text-sky-300',
    chatBubbleOtherMeta: 'text-sky-700 dark:text-sky-300',
    chatBubbleMeAudioBox: 'bg-black/15 border-white/25 text-white',
    chatBubbleOtherAudioBox: 'bg-white/90 dark:bg-sky-950/80 border-sky-300/70 dark:border-sky-700/70 text-sky-950 dark:text-sky-100',
    chatBubbleMeAudioLabel: 'text-cyan-100',
    chatBubbleOtherAudioLabel: 'text-sky-700 dark:text-sky-300',
    chatBubbleMeAudioText: 'text-white',
    chatBubbleOtherAudioText: 'text-sky-950 dark:text-sky-100',
    chatBubbleMeFileText: 'text-cyan-100',
    chatBubbleOtherFileText: 'text-sky-700 dark:text-cyan-300',
    chatBubbleMeReactionChip: 'bg-white/20 text-white border-white/30',
    chatBubbleOtherReactionChip: 'bg-white dark:bg-sky-950 text-sky-950 dark:text-white border-sky-300 dark:border-sky-700',
    chatComposerBarDefault: 'border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-slate-950',
    chatComposerBoxDefault: 'bg-white dark:bg-sky-950 border-sky-300 dark:border-sky-700 focus-within:border-sky-500 dark:focus-within:border-cyan-300/80',
    chatComposerDividerDefault: 'border-sky-200/80 dark:border-sky-800/80 bg-sky-50/70 dark:bg-sky-950/50',
    chatComposerIconDefault: 'text-sky-700 dark:text-sky-300 hover:bg-sky-200/70 dark:hover:bg-sky-800',
    chatSearchInputDefault: 'bg-sky-50 dark:bg-sky-950 border-sky-300 dark:border-sky-700 text-sky-950 dark:text-white placeholder-sky-600/60 dark:placeholder-sky-400 focus:border-sky-500',
    feedTabActive: 'bg-gradient-to-r from-sky-400 to-cyan-400 text-slate-950 font-extrabold shadow-md',
    liveBannerBorder: 'border-sky-400',
    headBubbleBorder: 'border-sky-400',
  },

  sunset: {
    id: 'sunset',
    name: 'Sunset',
    subtitle: 'Orange & Rose',
    metaLight: '#fff7ed',
    metaDark: '#2a1215',
    swatchGradient: 'from-orange-500 to-rose-600',
    swatchAccentDot: 'bg-amber-300',
    previewHeaderBar: 'from-amber-500 via-orange-500 to-rose-600',
    previewBubbleMe: 'bg-gradient-to-r from-orange-500 to-rose-600',
    previewBubbleOther: 'bg-orange-200 dark:bg-rose-800',
    appShellBg: 'bg-orange-50 dark:bg-stone-950 text-stone-900 dark:text-orange-50',
    sidebarBg: 'bg-white/95 dark:bg-stone-900/95 border-orange-200 dark:border-rose-900/70',
    sidebarBrandBorder: 'border-orange-400 bg-orange-50 dark:bg-rose-950',
    sidebarTitleText: 'text-stone-950 dark:text-white',
    sidebarSubText: 'text-orange-700 dark:text-amber-300',
    navActive: 'bg-gradient-to-r from-amber-400 to-orange-400 text-slate-950 font-bold shadow-xs',
    navInactive: 'text-stone-800 hover:bg-orange-100 dark:text-orange-100 dark:hover:bg-rose-950/80',
    sidebarFooterBorder: 'border-orange-200 dark:border-rose-900/70',
    sidebarCard: 'bg-orange-50 dark:bg-stone-950/70 border-orange-200 dark:border-rose-900/70 hover:bg-orange-100 dark:hover:bg-rose-950/70',
    sidebarMutedText: 'text-orange-700 dark:text-orange-300',
    topHeaderBg: 'border-orange-200 dark:border-rose-900/70 bg-gradient-to-b from-white via-orange-50/80 to-rose-50/70 dark:from-stone-950 dark:via-rose-950/70 dark:to-stone-950',
    heroCard: 'border-orange-400/60 dark:border-rose-400/45 bg-gradient-to-r from-orange-100 via-amber-50 to-rose-100 dark:from-stone-950 dark:via-rose-950/90 dark:to-orange-950/90 shadow-[0_4px_20px_rgba(234,88,12,0.14)] dark:shadow-[0_0_25px_rgba(251,146,60,0.22)]',
    heroGlowA: 'bg-amber-400/25 dark:bg-amber-400/15',
    heroGlowB: 'bg-rose-400/20',
    heroCorner: 'border-orange-600/75 dark:border-amber-300/80',
    heroWingLeft: 'from-transparent via-amber-500/80 dark:via-amber-400/80 to-rose-600 dark:to-rose-300',
    heroWingRight: 'from-transparent via-amber-500/80 dark:via-amber-400/80 to-rose-600 dark:to-rose-300',
    heroGem: 'bg-orange-500 dark:bg-amber-300 shadow-[0_0_8px_rgba(251,146,60,0.75)]',
    heroWordmark: 'from-rose-950 via-orange-600 via-50% to-amber-600 dark:from-amber-200 dark:via-white dark:via-50% dark:to-rose-300 drop-shadow-[0_2px_10px_rgba(249,115,22,0.22)] dark:drop-shadow-[0_3px_14px_rgba(251,146,60,0.4)]',
    heroSubtitleRow: 'text-rose-800/90 dark:text-amber-200/85',
    heroSubtitleLineLeft: 'to-orange-500/60 dark:to-amber-300/70',
    heroSubtitleLineRight: 'to-orange-500/60 dark:to-amber-300/70',
    searchIcon: 'text-orange-700 dark:text-orange-300',
    searchInput: 'bg-white dark:bg-stone-950 border-orange-300 dark:border-rose-800/80 text-stone-950 dark:text-white placeholder-orange-700/55 dark:placeholder-orange-300/60 focus:border-rose-500 dark:focus:border-amber-300/80',
    searchButton: 'bg-white dark:bg-stone-900 border-orange-300 dark:border-rose-800 text-stone-900 dark:text-orange-100 hover:bg-orange-100 dark:hover:bg-rose-950 hover:border-amber-400/70',
    drawerAside: 'bg-white dark:bg-stone-950 border-orange-200 dark:border-rose-900',
    drawerHeader: 'border-orange-200 dark:border-rose-900 bg-gradient-to-r from-orange-100/90 to-rose-50/90 dark:from-stone-900 dark:to-rose-950',
    drawerHeaderIcon: 'text-orange-700 dark:text-amber-300',
    drawerHeaderTitle: 'text-stone-950 dark:text-white',
    drawerCloseBtn: 'bg-white dark:bg-stone-950 border-orange-200 dark:border-rose-800 text-orange-800 dark:text-orange-200 hover:bg-orange-100 dark:hover:bg-rose-900',
    drawerSectionCard: 'bg-orange-50/75 dark:bg-rose-950/35 border-orange-200 dark:border-rose-900',
    drawerSectionBorder: 'border-orange-200 dark:border-rose-900',
    drawerPrimaryBtn: 'bg-orange-500 hover:bg-orange-400 text-white dark:text-slate-950',
    drawerSegmentedActive: 'bg-orange-600 text-white dark:bg-amber-400 dark:text-slate-950 shadow-xs',
    drawerSegmentedInactive: 'text-stone-800 hover:bg-orange-100 dark:text-orange-200 dark:hover:bg-rose-950',
    drawerSwitchTrackOn: 'bg-orange-400 border-orange-300',
    drawerSwitchTrackOff: 'bg-orange-200 border-orange-300',
    messagesPanelCard: 'bg-white dark:bg-stone-900/75 border-orange-200 dark:border-rose-900/70',
    chatHeaderDefault: 'border-orange-200 dark:border-rose-900/80 bg-gradient-to-r from-orange-100/90 via-white to-rose-100/85 dark:from-stone-950 dark:via-rose-950/85 dark:to-orange-950/80 text-stone-950 dark:text-white',
    chatHeaderSubtleHover: 'hover:bg-orange-100/80 dark:hover:bg-rose-900/60',
    chatHeaderBackBtn: 'bg-orange-100 dark:bg-rose-950 border-orange-300 dark:border-rose-800 text-stone-900 dark:text-orange-100 hover:bg-orange-200 dark:hover:bg-rose-900',
    chatRoomActive: 'bg-orange-200/90 dark:bg-rose-900/90 text-stone-950 dark:text-white border-2 border-orange-500 dark:border-amber-400 font-bold shadow-md',
    chatRoomInactive: 'bg-orange-50/80 dark:bg-stone-950 text-stone-900 dark:text-orange-200 border border-orange-200 dark:border-rose-900/70 hover:bg-orange-100 dark:hover:bg-rose-950',
    chatAccentBtn: 'bg-orange-500 hover:bg-orange-400 dark:bg-amber-400 dark:hover:bg-amber-300 text-white dark:text-slate-950 font-bold',
    chatSecondaryBtn: 'bg-orange-100/85 dark:bg-rose-950 border-orange-300 dark:border-rose-800 text-orange-800 dark:text-orange-200 hover:text-stone-950 dark:hover:text-white',
    chatActivePill: 'bg-amber-400 text-slate-950 shadow-2xs',
    chatBodyDefaultBg: 'bg-gradient-to-b from-orange-50/65 via-white to-rose-50/55 dark:from-stone-950/85 dark:via-rose-950/45 dark:to-stone-950/85',
    chatBubbleMeDefault: 'bg-gradient-to-br from-orange-500 to-rose-600 dark:from-orange-500 dark:to-rose-700 text-white border border-orange-400/70 dark:border-rose-400/40 shadow-sm',
    chatBubbleOtherDefault: 'bg-orange-50 dark:bg-stone-900/95 text-stone-950 dark:text-orange-50 border border-orange-200 dark:border-rose-800/75 shadow-2xs',
    chatBubbleMeMeta: 'text-orange-700 dark:text-amber-300',
    chatBubbleOtherMeta: 'text-orange-700 dark:text-amber-300',
    chatBubbleMeAudioBox: 'bg-black/15 border-white/25 text-white',
    chatBubbleOtherAudioBox: 'bg-white/90 dark:bg-stone-950/85 border-orange-300/70 dark:border-rose-800/70 text-stone-950 dark:text-orange-100',
    chatBubbleMeAudioLabel: 'text-amber-100',
    chatBubbleOtherAudioLabel: 'text-orange-700 dark:text-amber-300',
    chatBubbleMeAudioText: 'text-white',
    chatBubbleOtherAudioText: 'text-stone-950 dark:text-orange-50',
    chatBubbleMeFileText: 'text-amber-100',
    chatBubbleOtherFileText: 'text-orange-700 dark:text-amber-300',
    chatBubbleMeReactionChip: 'bg-white/20 text-white border-white/30',
    chatBubbleOtherReactionChip: 'bg-white dark:bg-stone-950 text-stone-950 dark:text-white border-orange-300 dark:border-rose-800',
    chatComposerBarDefault: 'border-orange-200 dark:border-rose-900/80 bg-orange-50 dark:bg-stone-950',
    chatComposerBoxDefault: 'bg-white dark:bg-stone-900 border-orange-300 dark:border-rose-800 focus-within:border-orange-500 dark:focus-within:border-amber-300/80',
    chatComposerDividerDefault: 'border-orange-200/80 dark:border-rose-900/80 bg-orange-50/70 dark:bg-stone-950/45',
    chatComposerIconDefault: 'text-orange-700 dark:text-orange-300 hover:bg-orange-200/70 dark:hover:bg-rose-900',
    chatSearchInputDefault: 'bg-orange-50 dark:bg-stone-950 border-orange-300 dark:border-rose-800 text-stone-950 dark:text-white placeholder-orange-700/55 dark:placeholder-orange-300/60 focus:border-orange-500',
    feedTabActive: 'bg-gradient-to-r from-amber-400 to-orange-400 text-slate-950 font-extrabold shadow-md',
    liveBannerBorder: 'border-orange-400',
    headBubbleBorder: 'border-orange-400',
  },

  royal: {
    id: 'royal',
    name: 'Royal',
    subtitle: 'Violet & Indigo',
    metaLight: '#f5f3ff',
    metaDark: '#1e1b4b',
    swatchGradient: 'from-violet-500 to-indigo-600',
    swatchAccentDot: 'bg-fuchsia-400',
    previewHeaderBar: 'from-violet-500 via-purple-500 to-indigo-600',
    previewBubbleMe: 'bg-gradient-to-r from-violet-500 to-indigo-600',
    previewBubbleOther: 'bg-violet-200 dark:bg-indigo-800',
    appShellBg: 'bg-violet-50 dark:bg-indigo-950 text-indigo-950 dark:text-violet-50',
    sidebarBg: 'bg-white/95 dark:bg-indigo-950/95 border-violet-200 dark:border-violet-800/80',
    sidebarBrandBorder: 'border-violet-400 bg-violet-50 dark:bg-indigo-950',
    sidebarTitleText: 'text-indigo-950 dark:text-white',
    sidebarSubText: 'text-violet-700 dark:text-violet-300',
    navActive: 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-bold shadow-xs',
    navInactive: 'text-indigo-900 hover:bg-violet-100 dark:text-violet-100 dark:hover:bg-indigo-900/80',
    sidebarFooterBorder: 'border-violet-200 dark:border-violet-800',
    sidebarCard: 'bg-violet-50 dark:bg-indigo-900/50 border-violet-200 dark:border-violet-800 hover:bg-violet-100 dark:hover:bg-indigo-900/80',
    sidebarMutedText: 'text-violet-700 dark:text-violet-300',
    topHeaderBg: 'border-violet-200 dark:border-violet-800/80 bg-gradient-to-b from-white via-violet-50/80 to-indigo-50/70 dark:from-indigo-950 dark:via-violet-950/85 dark:to-indigo-950',
    heroCard: 'border-violet-400/60 dark:border-fuchsia-400/45 bg-gradient-to-r from-violet-100 via-white to-indigo-100 dark:from-indigo-950 dark:via-violet-900/90 dark:to-indigo-950 shadow-[0_4px_20px_rgba(124,58,237,0.14)] dark:shadow-[0_0_25px_rgba(167,139,250,0.24)]',
    heroGlowA: 'bg-fuchsia-400/20 dark:bg-fuchsia-400/15',
    heroGlowB: 'bg-indigo-400/20',
    heroCorner: 'border-violet-600/75 dark:border-fuchsia-300/80',
    heroWingLeft: 'from-transparent via-fuchsia-500/80 dark:via-fuchsia-400/80 to-indigo-600 dark:to-violet-300',
    heroWingRight: 'from-transparent via-fuchsia-500/80 dark:via-fuchsia-400/80 to-indigo-600 dark:to-violet-300',
    heroGem: 'bg-fuchsia-500 dark:bg-fuchsia-300 shadow-[0_0_8px_rgba(232,121,249,0.75)]',
    heroWordmark: 'from-indigo-950 via-violet-700 via-50% to-fuchsia-600 dark:from-fuchsia-200 dark:via-white dark:via-50% dark:to-violet-300 drop-shadow-[0_2px_10px_rgba(139,92,246,0.22)] dark:drop-shadow-[0_3px_14px_rgba(192,132,252,0.4)]',
    heroSubtitleRow: 'text-violet-800/90 dark:text-fuchsia-200/85',
    heroSubtitleLineLeft: 'to-violet-500/60 dark:to-fuchsia-300/70',
    heroSubtitleLineRight: 'to-violet-500/60 dark:to-fuchsia-300/70',
    searchIcon: 'text-violet-700 dark:text-violet-300',
    searchInput: 'bg-white dark:bg-indigo-950 border-violet-300 dark:border-violet-700/80 text-indigo-950 dark:text-white placeholder-violet-600/60 dark:placeholder-violet-400 focus:border-fuchsia-500 dark:focus:border-fuchsia-300/80',
    searchButton: 'bg-white dark:bg-indigo-900 border-violet-300 dark:border-violet-700 text-indigo-900 dark:text-violet-100 hover:bg-violet-100 dark:hover:bg-indigo-800 hover:border-fuchsia-400/70',
    drawerAside: 'bg-white dark:bg-indigo-950 border-violet-200 dark:border-violet-800',
    drawerHeader: 'border-violet-200 dark:border-violet-800 bg-gradient-to-r from-violet-100/90 to-indigo-50/90 dark:from-indigo-950 dark:to-violet-950',
    drawerHeaderIcon: 'text-violet-700 dark:text-fuchsia-300',
    drawerHeaderTitle: 'text-indigo-950 dark:text-white',
    drawerCloseBtn: 'bg-white dark:bg-indigo-950 border-violet-200 dark:border-violet-700 text-violet-800 dark:text-violet-200 hover:bg-violet-100 dark:hover:bg-indigo-800',
    drawerSectionCard: 'bg-violet-50/75 dark:bg-indigo-900/45 border-violet-200 dark:border-violet-800',
    drawerSectionBorder: 'border-violet-200 dark:border-violet-800',
    drawerPrimaryBtn: 'bg-violet-600 hover:bg-violet-500 text-white',
    drawerSegmentedActive: 'bg-violet-600 text-white dark:bg-violet-400 dark:text-slate-950 shadow-xs',
    drawerSegmentedInactive: 'text-indigo-900 hover:bg-violet-100 dark:text-violet-200 dark:hover:bg-indigo-900',
    drawerSwitchTrackOn: 'bg-violet-500 border-violet-400',
    drawerSwitchTrackOff: 'bg-violet-200 border-violet-300',
    messagesPanelCard: 'bg-white dark:bg-indigo-950/70 border-violet-200 dark:border-violet-800/70',
    chatHeaderDefault: 'border-violet-200 dark:border-violet-800 bg-gradient-to-r from-violet-100/90 via-white to-indigo-100/85 dark:from-indigo-950 dark:via-violet-950/90 dark:to-indigo-900/85 text-indigo-950 dark:text-white',
    chatHeaderSubtleHover: 'hover:bg-violet-100/80 dark:hover:bg-indigo-900/70',
    chatHeaderBackBtn: 'bg-violet-100 dark:bg-indigo-900 border-violet-300 dark:border-violet-700 text-indigo-900 dark:text-violet-100 hover:bg-violet-200 dark:hover:bg-indigo-800',
    chatRoomActive: 'bg-violet-200/90 dark:bg-violet-900/90 text-indigo-950 dark:text-white border-2 border-violet-500 dark:border-fuchsia-400 font-bold shadow-md',
    chatRoomInactive: 'bg-violet-50/80 dark:bg-indigo-950 text-indigo-900 dark:text-violet-200 border border-violet-200 dark:border-violet-800 hover:bg-violet-100 dark:hover:bg-indigo-900',
    chatAccentBtn: 'bg-violet-600 hover:bg-violet-500 dark:bg-violet-400 dark:hover:bg-fuchsia-300 text-white dark:text-slate-950 font-bold',
    chatSecondaryBtn: 'bg-violet-100/85 dark:bg-indigo-900 border-violet-300 dark:border-violet-700 text-violet-800 dark:text-violet-200 hover:text-indigo-950 dark:hover:text-white',
    chatActivePill: 'bg-violet-500 text-white dark:bg-violet-400 dark:text-slate-950 shadow-2xs',
    chatBodyDefaultBg: 'bg-gradient-to-b from-violet-50/65 via-white to-indigo-50/55 dark:from-indigo-950/85 dark:via-violet-950/50 dark:to-indigo-950/80',
    chatBubbleMeDefault: 'bg-gradient-to-br from-violet-500 to-indigo-600 dark:from-violet-600 dark:to-indigo-700 text-white border border-violet-400/70 dark:border-fuchsia-400/40 shadow-sm',
    chatBubbleOtherDefault: 'bg-violet-50 dark:bg-indigo-900/85 text-indigo-950 dark:text-violet-50 border border-violet-200 dark:border-violet-700/75 shadow-2xs',
    chatBubbleMeMeta: 'text-violet-700 dark:text-violet-300',
    chatBubbleOtherMeta: 'text-violet-700 dark:text-violet-300',
    chatBubbleMeAudioBox: 'bg-black/15 border-white/25 text-white',
    chatBubbleOtherAudioBox: 'bg-white/90 dark:bg-indigo-950/80 border-violet-300/70 dark:border-violet-700/70 text-indigo-950 dark:text-violet-100',
    chatBubbleMeAudioLabel: 'text-fuchsia-100',
    chatBubbleOtherAudioLabel: 'text-violet-700 dark:text-violet-300',
    chatBubbleMeAudioText: 'text-white',
    chatBubbleOtherAudioText: 'text-indigo-950 dark:text-violet-100',
    chatBubbleMeFileText: 'text-fuchsia-100',
    chatBubbleOtherFileText: 'text-violet-700 dark:text-fuchsia-300',
    chatBubbleMeReactionChip: 'bg-white/20 text-white border-white/30',
    chatBubbleOtherReactionChip: 'bg-white dark:bg-indigo-950 text-indigo-950 dark:text-white border-violet-300 dark:border-violet-700',
    chatComposerBarDefault: 'border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-indigo-950',
    chatComposerBoxDefault: 'bg-white dark:bg-indigo-900 border-violet-300 dark:border-violet-700 focus-within:border-violet-500 dark:focus-within:border-fuchsia-300/80',
    chatComposerDividerDefault: 'border-violet-200/80 dark:border-violet-800/80 bg-violet-50/70 dark:bg-indigo-950/45',
    chatComposerIconDefault: 'text-violet-700 dark:text-violet-300 hover:bg-violet-200/70 dark:hover:bg-indigo-800',
    chatSearchInputDefault: 'bg-violet-50 dark:bg-indigo-950 border-violet-300 dark:border-violet-700 text-indigo-950 dark:text-white placeholder-violet-600/60 dark:placeholder-violet-400 focus:border-violet-500',
    feedTabActive: 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-extrabold shadow-md',
    liveBannerBorder: 'border-violet-400',
    headBubbleBorder: 'border-violet-400',
  },
};

export const COLOR_THEME_LIST: ThemePreset[] = [
  THEME_PRESETS.forest,
  THEME_PRESETS.ocean,
  THEME_PRESETS.sunset,
  THEME_PRESETS.royal,
];
