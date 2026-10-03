import type { WineColor } from "@/lib/db/schema";

/**
 * Indicative drinking-window estimate: years after the vintage for
 * [drink from, peak from, peak until, drink until]. Rules are checked in order;
 * the first one whose pattern and colors match wins.
 */
type Offsets = [number, number, number, number];
type Rule = { re: RegExp; colors?: WineColor[]; offsets: Offsets };

const RED: WineColor[] = ["red"];
const WHITE: WineColor[] = ["white"];
const SWEET: WineColor[] = ["sweet", "white"];

const GRAND_CRU_RED_BURGUNDY =
  /chambertin|musigny|clos de vougeot|clos vougeot|richebourg|romanée|la tâche|echezeaux|échezeaux|corton|bonnes-mares|clos de la roche|clos saint-denis|clos de tart|clos des lambrays|la grande rue/;
const GRAND_CRU_WHITE_BURGUNDY = /montrachet|corton-charlemagne|charlemagne|chablis grand cru/;
const COTE_DOR_VILLAGES =
  /gevrey|vosne|nuits-saint-georges|pommard|volnay|chambolle|morey|aloxe|savigny|beaune|meursault|puligny|chassagne|saint-aubin|santenay|monthelie|auxey|marsannay|fixin|ladoix|pernand|blagny/;

const RULES: Rule[] = [
  // Sweet & fortified
  { re: /sauternes|barsac|tokaj/, colors: SWEET, offsets: [5, 10, 25, 40] },
  { re: /layon|bonnezeaux|quarts de chaume|vouvray|montlouis|jurançon|jurancon|monbazillac|loupiac|cadillac|sainte-croix|coteaux de l'aubance|vendanges tardives|grains nobles/, colors: ["sweet"], offsets: [3, 6, 15, 25] },
  { re: /vin jaune|château-chalon|chateau-chalon/, offsets: [10, 15, 40, 60] },
  { re: /vintage port|porto vintage|\bvintage\b.*port/, colors: ["fortified"], offsets: [10, 20, 40, 60] },
  { re: /maury|banyuls|rivesaltes|rasteau/, colors: ["fortified", "sweet"], offsets: [2, 5, 20, 30] },

  // Bordeaux
  { re: /pauillac|margaux|saint-julien|saint-estèphe|saint-estephe|pessac|pomerol|saint-émilion grand cru|saint-emilion grand cru|premier grand cru|grand cru classé/, colors: RED, offsets: [6, 10, 20, 30] },
  { re: /pessac|graves/, colors: WHITE, offsets: [2, 4, 10, 15] },
  { re: /haut-médoc|haut-medoc|médoc|medoc|listrac|moulis|saint-émilion|saint-emilion|fronsac|lalande|graves|montagne|lussac|puisseguin/, colors: RED, offsets: [4, 6, 12, 18] },
  { re: /bordeaux supérieur|côtes de bordeaux|cotes de bordeaux|côtes de bourg|blaye|castillon|entre-deux-mers/, colors: RED, offsets: [2, 4, 8, 12] },
  { re: /bordeaux/, colors: RED, offsets: [1, 3, 6, 8] },

  // Burgundy & Beaujolais
  { re: GRAND_CRU_WHITE_BURGUNDY, colors: WHITE, offsets: [4, 7, 15, 20] },
  { re: GRAND_CRU_RED_BURGUNDY, colors: RED, offsets: [7, 10, 20, 30] },
  { re: /premier cru|1er cru/, colors: RED, offsets: [4, 6, 12, 18] },
  { re: /premier cru|1er cru/, colors: WHITE, offsets: [3, 5, 10, 14] },
  { re: COTE_DOR_VILLAGES, colors: RED, offsets: [3, 5, 10, 14] },
  { re: COTE_DOR_VILLAGES, colors: WHITE, offsets: [2, 4, 8, 12] },
  { re: /petit chablis/, offsets: [1, 1, 3, 4] },
  { re: /chablis/, offsets: [2, 3, 7, 10] },
  { re: /morgon|moulin-à-vent|moulin-a-vent|fleurie|juliénas|julienas|chénas|chenas|chiroubles|brouilly|régnié|regnie|saint-amour/, colors: RED, offsets: [1, 3, 6, 10] },
  { re: /beaujolais/, offsets: [0, 1, 2, 4] },
  { re: /bourgogne|mâcon|macon|pouilly-fuissé|pouilly-fuisse|saint-véran|rully|mercurey|givry|montagny/, colors: RED, offsets: [1, 2, 5, 7] },
  { re: /bourgogne|mâcon|macon|pouilly-fuissé|pouilly-fuisse|saint-véran|rully|mercurey|givry|montagny|aligoté/, colors: WHITE, offsets: [1, 2, 4, 6] },

  // Rhône
  { re: /hermitage|côte rôtie|côte-rôtie|cote rotie|cornas/, colors: RED, offsets: [6, 10, 20, 30] },
  { re: /hermitage/, colors: WHITE, offsets: [4, 8, 20, 30] },
  { re: /condrieu|viognier/, offsets: [1, 2, 4, 6] },
  { re: /crozes|saint-joseph/, colors: RED, offsets: [2, 4, 8, 12] },
  { re: /châteauneuf|chateauneuf|gigondas|vacqueyras|rasteau|vinsobres|cairanne/, colors: RED, offsets: [3, 6, 12, 18] },
  { re: /côtes du rhône|cotes du rhone|ventoux|luberon|costières|costieres/, colors: RED, offsets: [1, 2, 5, 7] },

  // South & South-West
  { re: /bandol/, colors: RED, offsets: [5, 8, 15, 25] },
  { re: /madiran|cahors/, colors: RED, offsets: [4, 7, 15, 20] },
  { re: /pic saint-loup|terrasses du larzac|faugères|faugeres|saint-chinian|minervois|corbières|corbieres|fitou|collioure/, colors: RED, offsets: [2, 4, 8, 12] },

  // Jura (whites and savagnin age well; vin jaune handled above)
  { re: /arbois|côtes du jura|cotes du jura|l'étoile|l'etoile|savagnin|jura/, colors: WHITE, offsets: [2, 4, 10, 15] },
  { re: /arbois|côtes du jura|cotes du jura|jura|poulsard|trousseau/, colors: RED, offsets: [1, 3, 8, 12] },

  // Loire
  { re: /savennières|savennieres/, offsets: [3, 6, 15, 20] },
  { re: /chinon|bourgueil|saumur-champigny|saint-nicolas/, colors: RED, offsets: [2, 4, 8, 12] },
  { re: /sancerre|pouilly-fumé|pouilly-fume|menetou|quincy|reuilly/, offsets: [1, 2, 4, 6] },
  { re: /muscadet/, offsets: [1, 1, 3, 5] },

  // Alsace & Champagne
  { re: /alsace grand cru|grand cru/, colors: WHITE, offsets: [3, 5, 12, 18] },
  { re: /alsace|riesling|gewurztraminer|pinot gris/, colors: WHITE, offsets: [1, 2, 5, 8] },
  { re: /champagne/, colors: ["sparkling"], offsets: [3, 6, 12, 20] },

  // Italy, Spain, Portugal, New World classics
  { re: /barolo|barbaresco/, colors: RED, offsets: [6, 10, 20, 30] },
  { re: /brunello/, colors: RED, offsets: [6, 10, 20, 25] },
  { re: /amarone/, colors: RED, offsets: [5, 8, 15, 20] },
  { re: /chianti classico|vino nobile|bolgheri|taurasi/, colors: RED, offsets: [3, 5, 10, 15] },
  { re: /gran reserva/, colors: RED, offsets: [5, 8, 18, 25] },
  { re: /reserva|rioja|ribera del duero|priorat|douro/, colors: RED, offsets: [3, 5, 10, 15] },
  { re: /napa|bordeaux blend|cabernet sauvignon/, colors: RED, offsets: [3, 6, 12, 18] },
];

const DEFAULTS: Record<WineColor, Offsets> = {
  red: [2, 3, 6, 10],
  white: [1, 1, 3, 5],
  rose: [0, 0, 1, 2],
  sparkling: [1, 2, 3, 5],
  sweet: [2, 5, 12, 20],
  fortified: [2, 5, 15, 25],
};

export type WindowEstimate = { drinkFrom: number; peakFrom: number; peakUntil: number; drinkUntil: number };

export function estimateWindow(input: {
  color: WineColor;
  vintage: number | null;
  appellation?: string | null;
  region?: string | null;
  name?: string | null;
}): WindowEstimate | null {
  const year = new Date().getFullYear();
  if (!input.vintage) {
    // Non-vintage sparkling/fortified/rosé: meant to be drunk now.
    if (["sparkling", "fortified", "rose"].includes(input.color)) {
      return { drinkFrom: year, peakFrom: year, peakUntil: year + 1, drinkUntil: year + 3 };
    }
    return null;
  }
  const haystack = [input.appellation, input.name, input.region].filter(Boolean).join(" ").toLowerCase();
  const rule = RULES.find((r) => r.re.test(haystack) && (!r.colors || r.colors.includes(input.color)));
  const [a, b, c, d] = rule?.offsets ?? DEFAULTS[input.color];
  const v = input.vintage;
  return { drinkFrom: v + a, peakFrom: v + b, peakUntil: v + c, drinkUntil: v + d };
}
