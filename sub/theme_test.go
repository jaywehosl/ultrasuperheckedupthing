package sub

import (
	"strings"
	"testing"
)

func TestThemeToCSS_Basic(t *testing.T) {
	theme := &PanelTheme{
		Tokens: map[string]any{
			"--color-primary":   "#3279f9",
			"--radius-scale":     "1.5",
			"--glass-blur":      "30px",
			"--shadow-intensity": 0.8,
		},
		Background: &ThemeBackground{
			Type:    "image",
			AssetID: "bg_1234.png",
		},
		Fonts: &ThemeFonts{
			Sans:    "asset:font_abc",
			Display: "Outfit",
		},
	}

	css := ThemeToCSS(theme, "/prefix/")

	// Verify primary color
	if !strings.Contains(css, "--color-primary: #3279f9;") {
		t.Errorf("Expected primary color to be set. Got: %s", css)
	}

	// Verify glass blur
	if !strings.Contains(css, "--glass-blur: 30px;") {
		t.Errorf("Expected glass blur to be set. Got: %s", css)
	}

	// Verify shadow intensity
	if !strings.Contains(css, "--shadow-intensity: 0.8;") {
		t.Errorf("Expected shadow intensity to be set. Got: %s", css)
	}

	// Verify background image URL with base path prefix
	if !strings.Contains(css, `--bg-image: url("/prefix/theme/asset/bg_1234.png");`) {
		t.Errorf("Expected bg image URL with base path. Got: %s", css)
	}

	// Verify @font-face and font-sans family
	if !strings.Contains(css, `@font-face{font-family:"uup-font-fontabc";font-display:swap;src:url("/prefix/theme/asset/font_abc")}`) {
		t.Errorf("Expected @font-face rules. Got: %s", css)
	}
	if !strings.Contains(css, `--font-sans: "uup-font-fontabc", sans-serif;`) {
		t.Errorf("Expected --font-sans family mapping. Got: %s", css)
	}

	// Verify --font-display standard resolution
	if !strings.Contains(css, `--font-display: Outfit;`) {
		t.Errorf("Expected --font-display to be set. Got: %s", css)
	}

	// Verify radius ramp scale expansion: md base is 16px * 1.5 = 24px
	if !strings.Contains(css, "--radius-md: 24px;") {
		t.Errorf("Expected scaled md radius of 24px. Got: %s", css)
	}
}
