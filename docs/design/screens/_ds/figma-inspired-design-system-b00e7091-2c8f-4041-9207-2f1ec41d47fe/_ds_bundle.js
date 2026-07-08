/* @ds-bundle: {"format":4,"namespace":"FigmaInspiredDesignSystem_b00e70","components":[{"name":"Button","sourcePath":"components/actions/Button.jsx"},{"name":"IconButton","sourcePath":"components/actions/IconButton.jsx"},{"name":"FeatureTile","sourcePath":"components/cards/FeatureTile.jsx"},{"name":"PricingCard","sourcePath":"components/cards/PricingCard.jsx"},{"name":"TemplateCard","sourcePath":"components/cards/TemplateCard.jsx"},{"name":"PillTabs","sourcePath":"components/forms/PillTabs.jsx"},{"name":"TextInput","sourcePath":"components/forms/TextInput.jsx"},{"name":"Checkmark","sourcePath":"components/glyphs/Checkmark.jsx"},{"name":"Footer","sourcePath":"components/navigation/Footer.jsx"},{"name":"TopNav","sourcePath":"components/navigation/TopNav.jsx"},{"name":"ColorBlock","sourcePath":"components/sections/ColorBlock.jsx"},{"name":"MarqueeStrip","sourcePath":"components/sections/MarqueeStrip.jsx"},{"name":"PromoBanner","sourcePath":"components/sections/PromoBanner.jsx"},{"name":"FilesScreen","sourcePath":"ui_kits/dashboard/FilesScreen.jsx"},{"name":"KitIcon","sourcePath":"ui_kits/dashboard/KitIcon.jsx"},{"name":"PlansScreen","sourcePath":"ui_kits/dashboard/PlansScreen.jsx"},{"name":"SettingsScreen","sourcePath":"ui_kits/dashboard/SettingsScreen.jsx"},{"name":"Sidebar","sourcePath":"ui_kits/dashboard/Sidebar.jsx"}],"sourceHashes":{"components/actions/Button.jsx":"10bf1a788d95","components/actions/IconButton.jsx":"65891bf07d2c","components/cards/FeatureTile.jsx":"45ee00d02af3","components/cards/PricingCard.jsx":"bb73033685f8","components/cards/TemplateCard.jsx":"a950e39fb04c","components/forms/PillTabs.jsx":"b34b1dde2d9c","components/forms/TextInput.jsx":"cea42bf6caab","components/glyphs/Checkmark.jsx":"d7602e5c5db5","components/navigation/Footer.jsx":"bf11343ea526","components/navigation/TopNav.jsx":"2cb7dbb7cb71","components/sections/ColorBlock.jsx":"a734627fdc42","components/sections/MarqueeStrip.jsx":"2823bb4429fe","components/sections/PromoBanner.jsx":"a7471dc636a8","ui_kits/dashboard/FilesScreen.jsx":"c32c7e677281","ui_kits/dashboard/KitIcon.jsx":"064db27bdb43","ui_kits/dashboard/PlansScreen.jsx":"cf9efab179ed","ui_kits/dashboard/SettingsScreen.jsx":"8b0464131d34","ui_kits/dashboard/Sidebar.jsx":"d08a7994d96f"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.FigmaInspiredDesignSystem_b00e70 = window.FigmaInspiredDesignSystem_b00e70 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/actions/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Self-contained CSS (custom-property driven, injected once) */
const BUTTON_CSS_ID = "fds-button-css";
const BUTTON_CSS = `
.fds-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  border: 0; cursor: pointer; text-decoration: none; white-space: nowrap;
  border-radius: var(--radius-pill);
  font-family: var(--font-sans);
  font-size: var(--type-link-size); font-weight: var(--type-link-weight);
  line-height: var(--type-link-leading); letter-spacing: var(--type-link-tracking);
  transition: transform 150ms ease, background-color 150ms ease;
}
.fds-btn:active { transform: scale(0.98); } /* pressed = micro-scale, never a darkened fill */
.fds-btn:focus-visible { outline: 2px solid var(--color-ink); outline-offset: 2px; }
.fds-btn[disabled] { opacity: 0.4; cursor: default; pointer-events: none; }
.fds-btn--primary { background: var(--color-primary); color: var(--color-on-primary); padding: 10px 20px; }
.fds-btn--secondary { background: var(--color-canvas); color: var(--color-ink); padding: 8px 18px 10px; } /* asymmetric pad optically centers type */
.fds-btn--tertiary { background: transparent; color: var(--color-ink); padding: 8px 12px; border-radius: var(--radius-full); }
.fds-btn--tertiary:hover { background: var(--color-surface-soft); }
.fds-btn--magenta { background: var(--color-accent-magenta); color: var(--color-on-primary); padding: 10px 18px; }
`;
if (typeof document !== "undefined" && !document.getElementById(BUTTON_CSS_ID)) {
  const s = document.createElement("style");
  s.id = BUTTON_CSS_ID;
  s.textContent = BUTTON_CSS;
  document.head.appendChild(s);
}

/**
 * Pill CTA — the only button shape in the system.
 * primary: black "Get started for free" pill · secondary: white pill, no border
 * tertiary: text link with pill hit-target · magenta: one promo CTA per page, max.
 */
function Button({
  variant = "primary",
  href,
  disabled,
  style,
  className = "",
  children,
  ...rest
}) {
  const cls = `fds-btn fds-btn--${variant} ${className}`.trim();
  if (href && !disabled) {
    return /*#__PURE__*/React.createElement("a", _extends({
      className: cls,
      href: href,
      style: style
    }, rest), children);
  }
  return /*#__PURE__*/React.createElement("button", _extends({
    className: cls,
    disabled: disabled,
    style: style
  }, rest), children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/actions/Button.jsx", error: String((e && e.message) || e) }); }

// components/actions/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const ICONBTN_CSS_ID = "fds-iconbtn-css";
const ICONBTN_CSS = `
.fds-iconbtn {
  width: 40px; height: 40px; border: 0; cursor: pointer;
  border-radius: var(--radius-full);
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--color-surface-soft); color: var(--color-ink);
  transition: transform 150ms ease;
  padding: 0;
}
.fds-iconbtn:active { transform: scale(0.95); }
.fds-iconbtn:focus-visible { outline: 2px solid var(--color-ink); outline-offset: 2px; }
.fds-iconbtn--inverse { background: var(--color-on-inverse-soft); color: var(--color-inverse-ink); }
.fds-iconbtn__glyph { display: inline-block; background-color: currentColor; }
`;
if (typeof document !== "undefined" && !document.getElementById(ICONBTN_CSS_ID)) {
  const s = document.createElement("style");
  s.id = ICONBTN_CSS_ID;
  s.textContent = ICONBTN_CSS;
  document.head.appendChild(s);
}

/**
 * 40px circular icon button — carousel controls, social links, inline actions.
 * Light surfaces use surface-soft fill; dark/color-block surfaces use 16% white.
 * Pass `src` (an SVG url, e.g. assets/icons/arrow-right.svg) — it is masked so
 * the glyph inherits currentColor — or pass custom children.
 */
function IconButton({
  inverse = false,
  src,
  label,
  size = 40,
  iconSize = 20,
  style,
  className = "",
  children,
  ...rest
}) {
  const cls = `fds-iconbtn ${inverse ? "fds-iconbtn--inverse" : ""} ${className}`.trim();
  const dim = {
    width: size,
    height: size,
    ...style
  };
  return /*#__PURE__*/React.createElement("button", _extends({
    className: cls,
    "aria-label": label,
    title: label,
    style: dim
  }, rest), src ? /*#__PURE__*/React.createElement("span", {
    className: "fds-iconbtn__glyph",
    style: {
      width: iconSize,
      height: iconSize,
      WebkitMask: `url(${src}) center / contain no-repeat`,
      mask: `url(${src}) center / contain no-repeat`
    }
  }) : children);
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/actions/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/cards/FeatureTile.jsx
try { (() => {
const FEATURETILE_CSS_ID = "fds-featuretile-css";
const FEATURETILE_CSS = `
.fds-featuretile {
  background: var(--color-surface-soft); color: var(--color-ink);
  border-radius: var(--radius-md);
  padding: 24px;
  display: flex; flex-direction: column; gap: 16px;
  font-family: var(--font-sans);
  box-sizing: border-box;
}
.fds-featuretile__eyebrow {
  font-family: var(--font-mono); text-transform: uppercase;
  font-size: 14px; letter-spacing: 0.54px; line-height: 1.3;
}
.fds-featuretile__body { flex: 1; display: flex; align-items: center; justify-content: center; }
`;
if (typeof document !== "undefined" && !document.getElementById(FEATURETILE_CSS_ID)) {
  const s = document.createElement("style");
  s.id = FEATURETILE_CSS_ID;
  s.textContent = FEATURETILE_CSS;
  document.head.appendChild(s);
}

/**
 * Feature illustration tile — larger surface-soft composition holding a
 * product-UI mock or flat pastel illustration, labeled by a mono eyebrow.
 */
function FeatureTile({
  eyebrow,
  background,
  style,
  className = "",
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: `fds-featuretile ${className}`.trim(),
    style: {
      background,
      ...style
    }
  }, eyebrow && /*#__PURE__*/React.createElement("div", {
    className: "fds-featuretile__eyebrow"
  }, eyebrow), /*#__PURE__*/React.createElement("div", {
    className: "fds-featuretile__body"
  }, children));
}
Object.assign(__ds_scope, { FeatureTile });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/cards/FeatureTile.jsx", error: String((e && e.message) || e) }); }

// components/cards/TemplateCard.jsx
try { (() => {
const TEMPLATE_CSS_ID = "fds-templatecard-css";
const TEMPLATE_CSS = `
.fds-template {
  background: var(--color-surface-soft); color: var(--color-ink);
  border-radius: var(--radius-md);
  padding: 16px;
  display: flex; flex-direction: column; gap: 12px;
  font-family: var(--font-sans);
  cursor: pointer;
  box-sizing: border-box;
  transition: transform 150ms ease, box-shadow 150ms ease;
}
.fds-template:hover { box-shadow: var(--shadow-soft); } /* the rare, noticed shadow */
.fds-template:active { transform: scale(0.99); }
.fds-template__preview {
  border-radius: var(--radius-md);
  aspect-ratio: 16 / 10;
  overflow: hidden;
  display: flex; align-items: center; justify-content: center;
}
.fds-template__title {
  font-size: var(--type-body-sm-size); font-weight: 480;
  line-height: var(--type-body-sm-leading); letter-spacing: var(--type-body-sm-tracking);
}
.fds-template__meta {
  font-family: var(--font-mono); text-transform: uppercase;
  font-size: var(--type-caption-size); letter-spacing: var(--type-caption-tracking);
}
`;
if (typeof document !== "undefined" && !document.getElementById(TEMPLATE_CSS_ID)) {
  const s = document.createElement("style");
  s.id = TEMPLATE_CSS_ID;
  s.textContent = TEMPLATE_CSS;
  document.head.appendChild(s);
}

/**
 * Template/thumbnail tile — surface-soft ground, 8px radius, 16px padding.
 * The preview area holds an image or a flat pastel composition (children).
 */
function TemplateCard({
  title,
  meta,
  image,
  previewColor,
  onClick,
  style,
  className = "",
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: `fds-template ${className}`.trim(),
    onClick: onClick,
    style: style
  }, /*#__PURE__*/React.createElement("div", {
    className: "fds-template__preview",
    style: {
      background: previewColor || "var(--color-canvas)"
    }
  }, image ? /*#__PURE__*/React.createElement("img", {
    src: image,
    alt: "",
    style: {
      width: "100%",
      height: "100%",
      objectFit: "cover"
    }
  }) : children), title && /*#__PURE__*/React.createElement("div", {
    className: "fds-template__title"
  }, title), meta && /*#__PURE__*/React.createElement("div", {
    className: "fds-template__meta"
  }, meta));
}
Object.assign(__ds_scope, { TemplateCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/cards/TemplateCard.jsx", error: String((e && e.message) || e) }); }

// components/forms/PillTabs.jsx
try { (() => {
const PILLTABS_CSS_ID = "fds-pilltabs-css";
const PILLTABS_CSS = `
.fds-pilltabs { display: inline-flex; gap: 4px; align-items: center; }
.fds-pilltab {
  border: 0; cursor: pointer; white-space: nowrap;
  background: var(--color-canvas); color: var(--color-ink);
  border-radius: var(--radius-pill);
  padding: 8px 18px;
  font-family: var(--font-sans);
  font-size: var(--type-link-size); font-weight: var(--type-link-weight);
  line-height: var(--type-link-leading); letter-spacing: var(--type-link-tracking);
  transition: transform 150ms ease;
}
.fds-pilltab:active { transform: scale(0.98); }
.fds-pilltab:focus-visible { outline: 2px solid var(--color-ink); outline-offset: 2px; }
.fds-pilltab--selected { background: var(--color-primary); color: var(--color-on-primary); } /* selected = the primary surface */
`;
if (typeof document !== "undefined" && !document.getElementById(PILLTABS_CSS_ID)) {
  const s = document.createElement("style");
  s.id = PILLTABS_CSS_ID;
  s.textContent = PILLTABS_CSS;
  document.head.appendChild(s);
}

/**
 * Pill toggle (the pricing Starter/Professional/Organization/Enterprise switch).
 * The selected tab wears exactly the primary-button surface — black fill,
 * white text — so it reads as an active CTA, not a passive state.
 */
function PillTabs({
  options = [],
  value,
  onChange,
  style,
  className = ""
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: `fds-pilltabs ${className}`.trim(),
    role: "tablist",
    style: style
  }, options.map(opt => {
    const val = typeof opt === "string" ? opt : opt.value;
    const lab = typeof opt === "string" ? opt : opt.label;
    const selected = val === value;
    return /*#__PURE__*/React.createElement("button", {
      key: val,
      role: "tab",
      "aria-selected": selected,
      className: `fds-pilltab ${selected ? "fds-pilltab--selected" : ""}`.trim(),
      onClick: () => onChange && onChange(val)
    }, lab);
  }));
}
Object.assign(__ds_scope, { PillTabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/PillTabs.jsx", error: String((e && e.message) || e) }); }

// components/forms/TextInput.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const INPUT_CSS_ID = "fds-input-css";
const INPUT_CSS = `
.fds-input-field {
  display: block; width: 100%; box-sizing: border-box;
  background: var(--color-canvas); color: var(--color-ink);
  font-family: var(--font-sans);
  font-size: var(--type-body-size); font-weight: var(--type-body-weight);
  line-height: var(--type-body-leading); letter-spacing: var(--type-body-tracking);
  border: var(--border-hairline);
  border-radius: var(--radius-md);
  padding: 12px 14px;
  transition: box-shadow 120ms ease, border-color 120ms ease;
}
.fds-input-field::placeholder { color: var(--color-ink); opacity: 0.35; }
.fds-input-field:focus { /* focus = ring, never a fill change */
  outline: none;
  border-color: var(--color-ink);
  box-shadow: 0 0 0 1px var(--color-ink);
}
.fds-input-label {
  display: block; margin-bottom: 8px;
  font-family: var(--font-sans);
  font-size: var(--type-body-lg-size); font-weight: var(--type-body-lg-weight);
  line-height: var(--type-body-lg-leading); letter-spacing: var(--type-body-lg-tracking);
}
`;
if (typeof document !== "undefined" && !document.getElementById(INPUT_CSS_ID)) {
  const s = document.createElement("style");
  s.id = INPUT_CSS_ID;
  s.textContent = INPUT_CSS;
  document.head.appendChild(s);
}

/**
 * Standard form field — white fill, 1px hairline, 8px radius, 12/14 padding.
 * Focus is communicated via ring, not via fill change. Labels sit above in
 * body-lg (the documented contact-form label voice).
 */
function TextInput({
  label,
  multiline = false,
  rows = 4,
  style,
  className = "",
  ...rest
}) {
  const field = multiline ? /*#__PURE__*/React.createElement("textarea", _extends({
    className: `fds-input-field ${className}`.trim(),
    rows: rows,
    style: {
      resize: "vertical",
      ...style
    }
  }, rest)) : /*#__PURE__*/React.createElement("input", _extends({
    className: `fds-input-field ${className}`.trim(),
    style: style
  }, rest));
  if (!label) return field;
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: "block"
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "fds-input-label"
  }, label), field);
}
Object.assign(__ds_scope, { TextInput });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/TextInput.jsx", error: String((e && e.message) || e) }); }

// components/glyphs/Checkmark.jsx
try { (() => {
/**
 * 16px comparison checkmark — white circle, success-green glyph.
 * Green is a glyph fill in this system, never a surface.
 */
function Checkmark({
  size = 16,
  style,
  className = ""
}) {
  return /*#__PURE__*/React.createElement("span", {
    className: className,
    style: {
      width: size,
      height: size,
      borderRadius: "var(--radius-full)",
      background: "var(--color-canvas)",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      flex: "none",
      ...style
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: size * 0.75,
    height: size * 0.75,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "var(--color-success)",
    strokeWidth: "3",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M20 6 9 17l-5-5"
  })));
}
Object.assign(__ds_scope, { Checkmark });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/glyphs/Checkmark.jsx", error: String((e && e.message) || e) }); }

// components/cards/PricingCard.jsx
try { (() => {
const PRICING_CSS_ID = "fds-pricingcard-css";
const PRICING_CSS = `
.fds-pricing {
  background: var(--color-canvas); color: var(--color-ink);
  border: var(--border-hairline);
  border-radius: var(--radius-lg);
  padding: 24px;
  display: flex; flex-direction: column; gap: 16px;
  font-family: var(--font-sans);
  box-sizing: border-box;
}
.fds-pricing--featured { border-color: var(--color-ink); }
.fds-pricing__title {
  font-size: var(--type-card-title-size); font-weight: var(--type-card-title-weight);
  line-height: var(--type-card-title-leading);
}
.fds-pricing__price { font-size: 44px; font-weight: 340; line-height: 1.1; letter-spacing: -0.9px; }
.fds-pricing__period { font-size: var(--type-body-sm-size); font-weight: var(--type-body-sm-weight); }
.fds-pricing__desc {
  font-size: var(--type-body-size); font-weight: var(--type-body-weight);
  line-height: var(--type-body-leading); letter-spacing: var(--type-body-tracking);
}
.fds-pricing__rows { display: flex; flex-direction: column; margin: 0; padding: 0; list-style: none; }
.fds-pricing__row {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 0;
  border-bottom: var(--border-hairline-soft);
  font-size: var(--type-body-sm-size); font-weight: var(--type-body-sm-weight);
  line-height: var(--type-body-sm-leading);
}
.fds-pricing__row:last-child { border-bottom: 0; }
`;
if (typeof document !== "undefined" && !document.getElementById(PRICING_CSS_ID)) {
  const s = document.createElement("style");
  s.id = PRICING_CSS_ID;
  s.textContent = PRICING_CSS;
  document.head.appendChild(s);
}

/**
 * Pricing tier card — white, hairline-stroked (never shadowed), 24px radius,
 * 24px padding. Feature rows separate with the softest hairline.
 */
function PricingCard({
  title,
  price,
  period,
  description,
  features = [],
  cta,
  ctaVariant,
  featured = false,
  onSelect,
  style,
  className = ""
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: `fds-pricing ${featured ? "fds-pricing--featured" : ""} ${className}`.trim(),
    style: style
  }, /*#__PURE__*/React.createElement("div", {
    className: "fds-pricing__title"
  }, title), price != null && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "fds-pricing__price"
  }, price), period && /*#__PURE__*/React.createElement("span", {
    className: "fds-pricing__period"
  }, " ", period)), description && /*#__PURE__*/React.createElement("div", {
    className: "fds-pricing__desc"
  }, description), cta && /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: ctaVariant || (featured ? "primary" : "secondary"),
    onClick: onSelect,
    style: {
      alignSelf: "flex-start"
    }
  }, cta), features.length > 0 && /*#__PURE__*/React.createElement("ul", {
    className: "fds-pricing__rows"
  }, features.map((f, i) => /*#__PURE__*/React.createElement("li", {
    key: i,
    className: "fds-pricing__row"
  }, /*#__PURE__*/React.createElement(__ds_scope.Checkmark, null), /*#__PURE__*/React.createElement("span", null, f)))));
}
Object.assign(__ds_scope, { PricingCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/cards/PricingCard.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Footer.jsx
try { (() => {
const FOOTER_CSS_ID = "fds-footer-css";
const FOOTER_CSS = `
.fds-footer {
  background: var(--color-canvas); color: var(--color-ink);
  padding: 96px 32px;
  font-family: var(--font-sans);
  box-sizing: border-box;
}
.fds-footer__inner { max-width: var(--container-max); margin: 0 auto; display: flex; gap: 48px; }
.fds-footer__brand { font-size: 34px; font-weight: 540; letter-spacing: -0.8px; flex: 1; }
.fds-footer__col { display: flex; flex-direction: column; gap: 12px; min-width: 140px; }
.fds-footer__head {
  font-family: var(--font-mono); text-transform: uppercase;
  font-size: var(--type-caption-size); letter-spacing: var(--type-caption-tracking);
  margin-bottom: 8px;
}
.fds-footer__link {
  color: inherit; text-decoration: none;
  font-size: var(--type-body-sm-size); font-weight: var(--type-body-sm-weight);
  line-height: var(--type-body-sm-leading); letter-spacing: var(--type-body-sm-tracking);
}
.fds-footer__link:hover { text-decoration: underline; }
`;
if (typeof document !== "undefined" && !document.getElementById(FOOTER_CSS_ID)) {
  const s = document.createElement("style");
  s.id = FOOTER_CSS_ID;
  s.textContent = FOOTER_CSS;
  document.head.appendChild(s);
}

/**
 * Dense link-grid footer on white — plain-type wordmark top-left at display
 * weight, mono caption column heads, body-sm links. 96px vertical padding.
 */
function Footer({
  brand = "Figma",
  columns = [],
  style,
  className = ""
}) {
  return /*#__PURE__*/React.createElement("footer", {
    className: `fds-footer ${className}`.trim(),
    style: style
  }, /*#__PURE__*/React.createElement("div", {
    className: "fds-footer__inner"
  }, /*#__PURE__*/React.createElement("div", {
    className: "fds-footer__brand"
  }, brand), columns.map(col => /*#__PURE__*/React.createElement("div", {
    key: col.heading,
    className: "fds-footer__col"
  }, /*#__PURE__*/React.createElement("div", {
    className: "fds-footer__head"
  }, col.heading), col.links.map(l => /*#__PURE__*/React.createElement("a", {
    key: l,
    className: "fds-footer__link",
    href: "#",
    onClick: e => e.preventDefault()
  }, l))))));
}
Object.assign(__ds_scope, { Footer });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Footer.jsx", error: String((e && e.message) || e) }); }

// components/navigation/TopNav.jsx
try { (() => {
const TOPNAV_CSS_ID = "fds-topnav-css";
const TOPNAV_CSS = `
.fds-topnav {
  background: var(--color-canvas); color: var(--color-ink);
  height: 56px; box-sizing: border-box;
  display: flex; align-items: center; gap: 32px;
  padding: 0 32px;
  font-family: var(--font-sans);
  font-size: var(--type-body-sm-size); font-weight: var(--type-body-sm-weight);
  letter-spacing: var(--type-body-sm-tracking);
}
.fds-topnav--sticky { position: sticky; top: 0; z-index: 50; }
.fds-topnav__brand {
  font-size: 22px; font-weight: 540; letter-spacing: -0.4px;
  text-decoration: none; color: inherit; flex: none;
}
.fds-topnav__links { display: flex; gap: 8px; flex: 1; }
.fds-topnav__link {
  color: inherit; text-decoration: none; cursor: pointer;
  background: transparent; border: 0; font: inherit;
  padding: 6px 12px; border-radius: var(--radius-full);
}
.fds-topnav__link:hover { background: var(--color-surface-soft); }
.fds-topnav__link--active { font-weight: 480; }
.fds-topnav__actions { display: flex; gap: 8px; align-items: center; }
`;
if (typeof document !== "undefined" && !document.getElementById(TOPNAV_CSS_ID)) {
  const s = document.createElement("style");
  s.id = TOPNAV_CSS_ID;
  s.textContent = TOPNAV_CSS;
  document.head.appendChild(s);
}

/**
 * Sticky white 56px top bar: plain-type wordmark, body-sm nav links, and the
 * right-anchored white+black pill pair. Nav-scale pills use body-sm type.
 */
function TopNav({
  brand = "Figma",
  links = [],
  activeLink,
  onNavigate,
  secondaryCta = "Contact sales",
  primaryCta = "Get started for free",
  onSecondary,
  onPrimary,
  sticky = false,
  style,
  className = ""
}) {
  const navPill = {
    fontSize: 16,
    lineHeight: 1.45,
    letterSpacing: "-0.14px"
  };
  return /*#__PURE__*/React.createElement("nav", {
    className: `fds-topnav ${sticky ? "fds-topnav--sticky" : ""} ${className}`.trim(),
    style: style
  }, /*#__PURE__*/React.createElement("a", {
    className: "fds-topnav__brand",
    href: "#"
  }, brand), /*#__PURE__*/React.createElement("div", {
    className: "fds-topnav__links"
  }, links.map(l => {
    const label = typeof l === "string" ? l : l.label;
    return /*#__PURE__*/React.createElement("button", {
      key: label,
      className: `fds-topnav__link ${label === activeLink ? "fds-topnav__link--active" : ""}`.trim(),
      onClick: () => onNavigate && onNavigate(label)
    }, label);
  })), /*#__PURE__*/React.createElement("div", {
    className: "fds-topnav__actions"
  }, secondaryCta && /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "secondary",
    onClick: onSecondary,
    style: {
      ...navPill,
      padding: "6px 14px 8px"
    }
  }, secondaryCta), primaryCta && /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "primary",
    onClick: onPrimary,
    style: {
      ...navPill,
      padding: "8px 16px"
    }
  }, primaryCta)));
}
Object.assign(__ds_scope, { TopNav });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/TopNav.jsx", error: String((e && e.message) || e) }); }

// components/sections/ColorBlock.jsx
try { (() => {
const BLOCK_COLORS = {
  lime: "var(--color-block-lime)",
  lilac: "var(--color-block-lilac)",
  cream: "var(--color-block-cream)",
  pink: "var(--color-block-pink)",
  mint: "var(--color-block-mint)",
  coral: "var(--color-block-coral)",
  navy: "var(--color-block-navy)"
};
const COLORBLOCK_CSS_ID = "fds-colorblock-css";
const COLORBLOCK_CSS = `
.fds-colorblock {
  border-radius: var(--radius-lg);
  padding: 48px;
  color: var(--color-ink);
  font-family: var(--font-sans);
  box-sizing: border-box;
}
.fds-colorblock--inverse { color: var(--color-inverse-ink); }
.fds-colorblock__eyebrow {
  font-family: var(--font-mono); text-transform: uppercase;
  font-size: var(--type-eyebrow-size); letter-spacing: var(--type-eyebrow-tracking);
  line-height: var(--type-eyebrow-leading);
  margin-bottom: 24px;
}
.fds-colorblock__headline {
  font-size: var(--type-display-lg-size); font-weight: var(--type-display-lg-weight);
  line-height: var(--type-display-lg-leading); letter-spacing: var(--type-display-lg-tracking);
  margin-bottom: 24px;
  text-wrap: balance;
}
.fds-colorblock__body {
  font-size: var(--type-subhead-size); font-weight: var(--type-subhead-weight);
  line-height: var(--type-subhead-leading); letter-spacing: var(--type-subhead-tracking);
}
@media (max-width: 768px) {
  .fds-colorblock { border-radius: 0; } /* full-bleed poster effect on mobile */
}
`;
if (typeof document !== "undefined" && !document.getElementById(COLORBLOCK_CSS_ID)) {
  const s = document.createElement("style");
  s.id = COLORBLOCK_CSS_ID;
  s.textContent = COLORBLOCK_CSS;
  document.head.appendChild(s);
}

/**
 * The signature surface: a full-content-width pastel story panel, 24px
 * radius, 48px interior padding. Choose ONE block color per section and let
 * white canvas breathe (96px) before the next. Navy flips to inverse ink.
 */
function ColorBlock({
  color = "lime",
  eyebrow,
  headline,
  style,
  className = "",
  children
}) {
  const inverse = color === "navy";
  return /*#__PURE__*/React.createElement("section", {
    className: `fds-colorblock ${inverse ? "fds-colorblock--inverse" : ""} ${className}`.trim(),
    style: {
      background: BLOCK_COLORS[color] || color,
      ...style
    }
  }, eyebrow && /*#__PURE__*/React.createElement("div", {
    className: "fds-colorblock__eyebrow"
  }, eyebrow), headline && /*#__PURE__*/React.createElement("h2", {
    className: "fds-colorblock__headline",
    style: {
      margin: "0 0 24px"
    }
  }, headline), children && /*#__PURE__*/React.createElement("div", {
    className: "fds-colorblock__body"
  }, children));
}
Object.assign(__ds_scope, { ColorBlock });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/sections/ColorBlock.jsx", error: String((e && e.message) || e) }); }

// components/sections/MarqueeStrip.jsx
try { (() => {
const MARQUEE_CSS_ID = "fds-marquee-css";
const MARQUEE_CSS = `
.fds-marquee {
  background: var(--color-inverse-canvas); color: var(--color-inverse-ink);
  height: 36px; overflow: hidden; position: relative;
  display: flex; align-items: center;
  font-family: var(--font-sans);
  font-size: var(--type-body-sm-size); font-weight: var(--type-body-sm-weight);
  letter-spacing: var(--type-body-sm-tracking);
}
.fds-marquee__track {
  display: flex; gap: 64px; white-space: nowrap; flex: none;
  padding-right: 64px;
  animation: fds-marquee-scroll 28s linear infinite;
}
@media (prefers-reduced-motion: reduce) {
  .fds-marquee__track { animation: none; }
}
@keyframes fds-marquee-scroll {
  from { transform: translateX(0); }
  to { transform: translateX(-100%); }
}
`;
if (typeof document !== "undefined" && !document.getElementById(MARQUEE_CSS_ID)) {
  const s = document.createElement("style");
  s.id = MARQUEE_CSS_ID;
  s.textContent = MARQUEE_CSS;
  document.head.appendChild(s);
}

/**
 * Thin black customer-logo ribbon (36px) that scrolls white items
 * continuously. Sits directly under the top nav.
 */
function MarqueeStrip({
  items = [],
  style,
  className = ""
}) {
  const track = /*#__PURE__*/React.createElement("div", {
    className: "fds-marquee__track",
    "aria-hidden": "true"
  }, items.map((it, i) => /*#__PURE__*/React.createElement("span", {
    key: i
  }, it)));
  return /*#__PURE__*/React.createElement("div", {
    className: `fds-marquee ${className}`.trim(),
    style: style,
    role: "marquee",
    "aria-label": items.join(", ")
  }, track, track);
}
Object.assign(__ds_scope, { MarqueeStrip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/sections/MarqueeStrip.jsx", error: String((e && e.message) || e) }); }

// components/sections/PromoBanner.jsx
try { (() => {
const PROMO_CSS_ID = "fds-promobanner-css";
const PROMO_CSS = `
.fds-promo {
  background: var(--color-block-lilac); color: var(--color-ink);
  border-radius: var(--radius-md);
  padding: 16px 24px;
  display: flex; align-items: center; gap: 24px;
  font-family: var(--font-sans);
  font-size: var(--type-body-sm-size); font-weight: var(--type-body-sm-weight);
  line-height: var(--type-body-sm-leading); letter-spacing: var(--type-body-sm-tracking);
  box-sizing: border-box;
}
.fds-promo__copy { flex: 1; }
`;
if (typeof document !== "undefined" && !document.getElementById(PROMO_CSS_ID)) {
  const s = document.createElement("style");
  s.id = PROMO_CSS_ID;
  s.textContent = PROMO_CSS;
  document.head.appendChild(s);
}

/**
 * Inline promo banner — lilac ground, 8px radius, with the magenta pill CTA
 * on the right edge. The one place the magenta accent belongs.
 */
function PromoBanner({
  cta,
  onCta,
  style,
  className = "",
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: `fds-promo ${className}`.trim(),
    style: style
  }, /*#__PURE__*/React.createElement("div", {
    className: "fds-promo__copy"
  }, children), cta && /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "magenta",
    onClick: onCta,
    style: {
      fontSize: 16,
      padding: "8px 16px"
    }
  }, cta));
}
Object.assign(__ds_scope, { PromoBanner });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/sections/PromoBanner.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dashboard/KitIcon.jsx
try { (() => {
/**
 * Masked Lucide glyph for kit chrome — tints to currentColor.
 * Paths resolve relative to ui_kits/dashboard/index.html.
 */
function KitIcon({
  name,
  size = 18,
  style
}) {
  const url = `../../assets/icons/${name}.svg`;
  return /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      display: "inline-block",
      flex: "none",
      width: size,
      height: size,
      backgroundColor: "currentColor",
      WebkitMask: `url(${url}) center / contain no-repeat`,
      mask: `url(${url}) center / contain no-repeat`,
      ...style
    }
  });
}
Object.assign(__ds_scope, { KitIcon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dashboard/KitIcon.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dashboard/FilesScreen.jsx
try { (() => {
const SEED_FILES = [{
  name: "Onboarding flow v3",
  meta: "Design · 2h ago",
  color: "var(--color-block-lilac)",
  board: false
}, {
  name: "Q3 brainstorm",
  meta: "Board · 5h ago",
  color: "var(--color-block-mint)",
  board: true
}, {
  name: "Marketing site refresh",
  meta: "Design · 1d ago",
  color: "var(--color-block-cream)",
  board: false
}, {
  name: "Design system audit",
  meta: "Board · 2d ago",
  color: "var(--color-block-pink)",
  board: true
}, {
  name: "Mobile nav explorations",
  meta: "Design · 3d ago",
  color: "var(--color-block-coral)",
  board: false
}, {
  name: "Retro — sprint 41",
  meta: "Board · 1w ago",
  color: "var(--color-block-lime)",
  board: true
}, {
  name: "Checkout redesign",
  meta: "Design · 1w ago",
  color: "var(--color-block-lilac)",
  board: false
}, {
  name: "Icon inventory",
  meta: "Design · 2w ago",
  color: "var(--color-block-cream)",
  board: false
}];
function StickyNotes() {
  const sq = (bg, rot) => /*#__PURE__*/React.createElement("span", {
    style: {
      width: 34,
      height: 34,
      borderRadius: "var(--radius-sm)",
      background: bg,
      transform: `rotate(${rot}deg)`,
      display: "inline-block"
    }
  });
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      gap: 6
    }
  }, sq("var(--color-canvas)", -4), sq("rgba(255,255,255,0.7)", 3), sq("var(--color-canvas)", -1));
}

/**
 * Files home — recents grid, search, New file flow, dismissible lime banner.
 */
function FilesScreen({
  section = "recents"
}) {
  const [files, setFiles] = React.useState(SEED_FILES);
  const [query, setQuery] = React.useState("");
  const [banner, setBanner] = React.useState(true);
  const titles = {
    recents: "Recents",
    drafts: "Drafts",
    projects: "All projects"
  };
  const shown = files.filter(f => {
    if (query && !f.name.toLowerCase().includes(query.toLowerCase())) return false;
    if (section === "drafts") return f.meta.startsWith("Draft");
    return true;
  });
  const newFile = () => {
    setFiles([{
      name: "Untitled",
      meta: "Draft · just now",
      color: "var(--color-surface-soft)",
      board: false
    }, ...files]);
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "24px 40px 64px",
      display: "flex",
      flexDirection: "column",
      gap: 24,
      maxWidth: 1160
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontSize: 26,
      fontWeight: 540,
      letterSpacing: "-0.26px",
      flex: "none"
    }
  }, titles[section]), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      maxWidth: 420,
      marginLeft: 16
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.TextInput, {
    placeholder: "Search files",
    value: query,
    onChange: e => setQuery(e.target.value),
    style: {
      padding: "8px 14px",
      fontSize: 16,
      background: "var(--color-surface-soft)",
      borderColor: "transparent"
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: "auto",
      display: "flex",
      gap: 8,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    src: "../../assets/icons/bell.svg",
    label: "Notifications"
  }), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "secondary",
    style: {
      fontSize: 16,
      padding: "6px 14px 8px",
      background: "var(--color-surface-soft)"
    }
  }, "Share"), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    onClick: newFile,
    style: {
      fontSize: 16,
      padding: "8px 16px",
      display: "inline-flex",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.KitIcon, {
    name: "plus",
    size: 16,
    style: {
      backgroundColor: "currentColor"
    }
  }), "New file"))), banner && /*#__PURE__*/React.createElement(__ds_scope.ColorBlock, {
    color: "lime",
    style: {
      padding: "28px 32px",
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 26,
      fontWeight: 540,
      letterSpacing: "-0.26px",
      lineHeight: 1.35
    }
  }, "Systems keep teams in sync"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 18,
      fontWeight: 320,
      letterSpacing: "-0.26px",
      marginTop: 6
    }
  }, "Publish a shared library once \u2014 every file stays current.")), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "secondary",
    style: {
      fontSize: 16,
      padding: "8px 16px 10px"
    }
  }, "Explore libraries"), /*#__PURE__*/React.createElement(__ds_scope.IconButton, {
    src: "../../assets/icons/x.svg",
    label: "Dismiss",
    onClick: () => setBanner(false),
    style: {
      background: "rgba(255,255,255,0.5)"
    }
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "type-caption",
    style: {
      marginBottom: 16
    }
  }, section === "drafts" ? "Your drafts" : "Recently viewed", " \xB7 ", shown.length, " files"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(4, 1fr)",
      gap: 20
    }
  }, shown.map((f, i) => /*#__PURE__*/React.createElement(__ds_scope.TemplateCard, {
    key: f.name + i,
    title: f.name,
    meta: f.meta,
    previewColor: f.color
  }, f.board ? /*#__PURE__*/React.createElement(StickyNotes, null) : null))), shown.length === 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 48,
      textAlign: "center",
      background: "var(--color-surface-soft)",
      borderRadius: "var(--radius-md)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "type-body"
  }, "No files match \"", query, "\"."))));
}
Object.assign(__ds_scope, { FilesScreen });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dashboard/FilesScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dashboard/PlansScreen.jsx
try { (() => {
const FAQS = [["Can I change plans later?", "Yes — upgrades apply immediately, downgrades at the next cycle."], ["What counts as an editor?", "Anyone who can edit files. Viewers are always free."], ["Do you offer education plans?", "Verified students and educators get Professional free."]];

/**
 * Plans — billing toggle, three hairline pricing tiers, lime FAQ block.
 */
function PlansScreen() {
  const [billing, setBilling] = React.useState("Annual");
  const [open, setOpen] = React.useState(0);
  const price = (m, a) => billing === "Annual" ? a : m;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "24px 40px 64px",
      display: "flex",
      flexDirection: "column",
      gap: 32,
      maxWidth: 1160
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-end",
      gap: 24
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "type-caption",
    style: {
      marginBottom: 12
    }
  }, "Workspace \xB7 Plans"), /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontSize: 44,
      fontWeight: 340,
      letterSpacing: "-0.9px",
      lineHeight: 1.1
    }
  }, "Choose your plan")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: "auto",
      background: "var(--color-surface-soft)",
      borderRadius: "var(--radius-pill)",
      padding: 4
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.PillTabs, {
    options: ["Monthly", "Annual"],
    value: billing,
    onChange: setBilling
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: 20,
      alignItems: "start"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.PricingCard, {
    title: "Starter",
    price: "Free",
    description: "For individuals sketching ideas.",
    cta: "Current plan",
    ctaVariant: "tertiary",
    features: ["3 project files", "Unlimited collaborators", "Community templates"]
  }), /*#__PURE__*/React.createElement(__ds_scope.PricingCard, {
    title: "Professional",
    price: price("$15", "$12"),
    period: "per editor / month",
    description: "For teams shipping together.",
    cta: "Upgrade",
    featured: true,
    features: ["Unlimited files", "Shared libraries", "Version history", "Audio conversations"]
  }), /*#__PURE__*/React.createElement(__ds_scope.PricingCard, {
    title: "Organization",
    price: price("$55", "$45"),
    period: "per editor / month",
    description: "For companies scaling design.",
    cta: "Contact sales",
    features: ["Org-wide libraries", "Design system analytics", "Centralized admin", "SSO"]
  })), /*#__PURE__*/React.createElement(__ds_scope.ColorBlock, {
    color: "lime",
    eyebrow: "Questions",
    style: {
      padding: 40
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column"
    }
  }, FAQS.map(([q, a], i) => /*#__PURE__*/React.createElement("div", {
    key: q,
    style: {
      borderTop: i ? "1px solid rgba(0,0,0,0.14)" : "none",
      padding: "16px 0"
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setOpen(open === i ? -1 : i),
    style: {
      background: "transparent",
      border: 0,
      cursor: "pointer",
      padding: 0,
      width: "100%",
      textAlign: "left",
      fontFamily: "var(--font-sans)",
      fontSize: 20,
      fontWeight: 480,
      letterSpacing: "-0.1px",
      color: "var(--color-ink)",
      display: "flex",
      justifyContent: "space-between"
    }
  }, q, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 320
    }
  }, open === i ? "−" : "+")), open === i && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 18,
      fontWeight: 320,
      letterSpacing: "-0.26px",
      marginTop: 8,
      maxWidth: 640
    }
  }, a))))));
}
Object.assign(__ds_scope, { PlansScreen });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dashboard/PlansScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dashboard/SettingsScreen.jsx
try { (() => {
const MEMBERS = [{
  name: "Ada Okafor",
  email: "ada@acme.design",
  role: "Admin"
}, {
  name: "Sam Whitfield",
  email: "sam@acme.design",
  role: "Editor"
}, {
  name: "June Park",
  email: "june@acme.design",
  role: "Editor"
}, {
  name: "Theo Marchetti",
  email: "theo@acme.design",
  role: "Viewer"
}];

/**
 * Settings — team profile fields, hairline member rows, promo banner.
 */
function SettingsScreen() {
  const [members, setMembers] = React.useState(MEMBERS);
  const [saved, setSaved] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "24px 40px 64px",
      display: "flex",
      flexDirection: "column",
      gap: 32,
      maxWidth: 760
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "type-caption",
    style: {
      marginBottom: 12
    }
  }, "Workspace \xB7 Settings"), /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontSize: 44,
      fontWeight: 340,
      letterSpacing: "-0.9px",
      lineHeight: 1.1
    }
  }, "Team settings")), /*#__PURE__*/React.createElement(__ds_scope.PromoBanner, {
    cta: "Save your spot"
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 480
    }
  }, "Release notes live:"), " join the walkthrough this Thursday."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 20
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.TextInput, {
    label: "Team name",
    defaultValue: "Acme design"
  }), /*#__PURE__*/React.createElement(__ds_scope.TextInput, {
    label: "Billing email",
    defaultValue: "ops@acme.design",
    type: "email"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "type-caption",
    style: {
      marginBottom: 8
    }
  }, "Members \xB7 ", members.length), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: "var(--border-hairline)"
    }
  }, members.map(m => /*#__PURE__*/React.createElement("div", {
    key: m.email,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 16,
      padding: "14px 0",
      borderBottom: "var(--border-hairline-soft)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 480,
      letterSpacing: "-0.14px"
    }
  }, m.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 330,
      letterSpacing: "-0.14px"
    }
  }, m.email)), /*#__PURE__*/React.createElement("span", {
    className: "type-caption"
  }, m.role), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "tertiary",
    style: {
      fontSize: 16,
      padding: "6px 12px"
    },
    onClick: () => setMembers(members.filter(x => x.email !== m.email))
  }, "Remove"))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 12,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Button, {
    onClick: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 1600);
    },
    style: {
      fontSize: 16,
      padding: "8px 18px"
    }
  }, "Save changes"), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "tertiary",
    style: {
      fontSize: 16,
      padding: "6px 12px"
    }
  }, "Cancel"), saved && /*#__PURE__*/React.createElement("span", {
    className: "type-caption"
  }, "Saved")));
}
Object.assign(__ds_scope, { SettingsScreen });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dashboard/SettingsScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dashboard/Sidebar.jsx
try { (() => {
const SIDEBAR_CSS_ID = "fds-kit-sidebar-css";
const SIDEBAR_CSS = `
.kit-sidebar {
  width: 248px; flex: none; box-sizing: border-box;
  background: var(--color-canvas);
  border-right: var(--border-hairline);
  display: flex; flex-direction: column; gap: 4px;
  padding: 20px 12px;
  font-family: var(--font-sans);
}
.kit-sidebar__brand {
  font-size: 22px; font-weight: 540; letter-spacing: -0.4px;
  padding: 4px 12px 16px;
}
.kit-sidebar__caption {
  font-family: var(--font-mono); text-transform: uppercase;
  font-size: var(--type-caption-size); letter-spacing: var(--type-caption-tracking);
  padding: 20px 12px 8px;
}
.kit-sidebar__row {
  display: flex; align-items: center; gap: 10px;
  border: 0; background: transparent; cursor: pointer; text-align: left;
  color: var(--color-ink);
  font-family: var(--font-sans);
  font-size: var(--type-body-sm-size); font-weight: var(--type-body-sm-weight);
  letter-spacing: var(--type-body-sm-tracking);
  padding: 8px 12px; border-radius: var(--radius-full);
}
.kit-sidebar__row:hover { background: var(--color-surface-soft); }
.kit-sidebar__row--active { background: var(--color-surface-soft); font-weight: 480; }
`;
if (typeof document !== "undefined" && !document.getElementById(SIDEBAR_CSS_ID)) {
  const s = document.createElement("style");
  s.id = SIDEBAR_CSS_ID;
  s.textContent = SIDEBAR_CSS;
  document.head.appendChild(s);
}

/**
 * Workspace sidebar — applied marketing vocabulary: white surface, hairline
 * divider, pill-hover rows, mono group captions. Not from the real product.
 */
function Sidebar({
  active,
  onNavigate
}) {
  const row = (id, icon, label) => /*#__PURE__*/React.createElement("button", {
    key: id,
    className: `kit-sidebar__row ${active === id ? "kit-sidebar__row--active" : ""}`.trim(),
    onClick: () => onNavigate(id)
  }, /*#__PURE__*/React.createElement(__ds_scope.KitIcon, {
    name: icon,
    size: 16
  }), label);
  return /*#__PURE__*/React.createElement("aside", {
    className: "kit-sidebar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "kit-sidebar__brand"
  }, "Figma"), row("recents", "clock", "Recents"), row("drafts", "file", "Drafts"), row("projects", "folder", "All projects"), /*#__PURE__*/React.createElement("div", {
    className: "kit-sidebar__caption"
  }, "Workspace"), row("plans", "star", "Plans and billing"), row("settings", "settings", "Settings"));
}
Object.assign(__ds_scope, { Sidebar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dashboard/Sidebar.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Button = __ds_scope.Button;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.FeatureTile = __ds_scope.FeatureTile;

__ds_ns.PricingCard = __ds_scope.PricingCard;

__ds_ns.TemplateCard = __ds_scope.TemplateCard;

__ds_ns.PillTabs = __ds_scope.PillTabs;

__ds_ns.TextInput = __ds_scope.TextInput;

__ds_ns.Checkmark = __ds_scope.Checkmark;

__ds_ns.Footer = __ds_scope.Footer;

__ds_ns.TopNav = __ds_scope.TopNav;

__ds_ns.ColorBlock = __ds_scope.ColorBlock;

__ds_ns.MarqueeStrip = __ds_scope.MarqueeStrip;

__ds_ns.PromoBanner = __ds_scope.PromoBanner;

__ds_ns.FilesScreen = __ds_scope.FilesScreen;

__ds_ns.KitIcon = __ds_scope.KitIcon;

__ds_ns.PlansScreen = __ds_scope.PlansScreen;

__ds_ns.SettingsScreen = __ds_scope.SettingsScreen;

__ds_ns.Sidebar = __ds_scope.Sidebar;

})();
