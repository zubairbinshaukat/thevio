// PostCSS plugin, loaded by postcss.config.mjs.
//
// Three Tailwind builds can share a page: the chrome's (globals.css, every
// page), the Studio's controls (features/studio/studio.css) and the preview
// (features/preview/preview.css). Each emits classes like `.hidden` and
// `.flex`, and unscoped, whichever sheet loads last wins: the Studio's
// `hidden` would beat the site header's `md:block`, and the chrome's `hidden`
// a preview's `@4xl:flex`.
//
// So the two route-level builds are scoped to their own region:
// - preview.css: `.tv-preview X`. Only inside a ThemeScope, and there it
//   outranks the chrome's utilities by one class.
// - studio.css: `:not(.tv-preview *):where(.tv-studio, .tv-studio *)X`. The
//   Studio root and everything in it except the preview; one class above
//   the chrome's. The Studio's popovers portal into its root for this.
// Order within a build is unchanged: all its utilities gain the same
// specificity.

const SCOPES = [
  {
    file: /[\\/]features[\\/]preview[\\/]preview\.css$/,
    scope: (selector) => `.tv-preview ${selector}`,
  },
  {
    file: /[\\/]features[\\/]studio[\\/]studio\.css$/,
    scope: (selector) =>
      /^[.:#[]/.test(selector)
        ? `:not(.tv-preview *):where(.tv-studio, .tv-studio *)${selector}`
        : `:not(.tv-preview *):where(.tv-studio, .tv-studio *) ${selector}`,
  },
];

/** @type {import("postcss").PluginCreator<void>} */
const scopeUtilities = () => ({
  postcssPlugin: "thevio-scope-utilities",
  OnceExit(root) {
    const file = root.source?.input.file ?? "";
    const match = SCOPES.find((entry) => entry.file.test(file));
    if (!match) return;
    root.walkAtRules("layer", (layer) => {
      if (layer.params.trim() !== "utilities") return;
      layer.walkRules((rule) => {
        // Keyframe steps aren't selectors; nested rules inherit the scope.
        const parent = rule.parent;
        if (parent?.type === "rule") return;
        if (parent?.type === "atrule" && /keyframes$/i.test(parent.name)) {
          return;
        }
        rule.selectors = rule.selectors.map(match.scope);
      });
    });
  },
});
scopeUtilities.postcss = true;

export default scopeUtilities;
