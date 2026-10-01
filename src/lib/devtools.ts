/**
 * Demo builds only (`NEXT_PUBLIC_DEV_TOOLS=1 npm run build`): shows a "Preview as Pro" switch so the
 * Pro screens can be checked before Google Play billing exists. Release builds leave it off.
 */
export const DEV_TOOLS = process.env.NEXT_PUBLIC_DEV_TOOLS === '1';
