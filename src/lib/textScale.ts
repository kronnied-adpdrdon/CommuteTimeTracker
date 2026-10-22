/**
 * Android's text size setting reaches the page as a bigger font size, but widths don't grow with it, so rows of big
 * numbers side by side overlap. From this scale up, <html> gets `data-large-text` and those rows stack instead.
 */
export const LARGE_TEXT_FROM = 1.25;

/** Runs before the page draws (Android reloads the app when the text size changes, so once is enough). */
export const TEXT_SCALE_BOOT_SCRIPT = `try{if(parseFloat(getComputedStyle(document.documentElement).fontSize)/16>=${LARGE_TEXT_FROM})document.documentElement.setAttribute('data-large-text','')}catch(e){}`;
