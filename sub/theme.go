package sub

import (
	"encoding/json"
	"fmt"
	"math"
	"regexp"
	"strings"
)

type ThemeBackground struct {
	Type    string   `json:"type,omitempty"`
	Color   string   `json:"color,omitempty"`
	AssetID string   `json:"assetId,omitempty"`
	Dim     *float64 `json:"dim,omitempty"`
	Blur    string   `json:"blur,omitempty"`
}

type ThemeFonts struct {
	Sans    string `json:"sans,omitempty"`
	Display string `json:"display,omitempty"`
	Mono    string `json:"mono,omitempty"`
}

type ThemeParticles struct {
	On      *bool    `json:"on,omitempty"`
	Density *float64 `json:"density,omitempty"`
	Speed   *float64 `json:"speed,omitempty"` // maps to intensity in WebGL
	Color   string   `json:"color,omitempty"`
}

type ThemeEffects struct {
	Particles *ThemeParticles `json:"particles,omitempty"`
	HoverGlow *bool           `json:"hoverGlow,omitempty"`
}

type PanelTheme struct {
	Mode       string            `json:"mode,omitempty"`
	Tokens     map[string]any    `json:"tokens,omitempty"`
	Background *ThemeBackground `json:"background,omitempty"`
	Fonts      *ThemeFonts       `json:"fonts,omitempty"`
	Effects    *ThemeEffects     `json:"effects,omitempty"`
}

var radiusRamp = map[string]float64{
	"--radius-xs":  8,
	"--radius-sm":  12,
	"--radius-md":  16,
	"--radius-lg":  20,
	"--radius-xl":  24,
	"--radius-2xl": 28,
}

var nonAlphaNumRegex = regexp.MustCompile(`[^a-zA-Z0-9]`)

func normalizeKey(k string) string {
	if strings.HasPrefix(k, "--") {
		return k
	}
	return "--" + k
}

func resolveFont(raw string, fallback string, basePath string, fontFaces *[]string) string {
	if raw == "" {
		return ""
	}
	if !strings.HasPrefix(raw, "asset:") {
		return raw
	}
	id := raw[len("asset:"):]
	family := "uup-font-" + nonAlphaNumRegex.ReplaceAllString(id, "")
	*fontFaces = append(*fontFaces, fmt.Sprintf("@font-face{font-family:\"%s\";font-display:swap;src:url(\"%stheme/asset/%s\")}", family, basePath, id))
	return fmt.Sprintf("\"%s\", %s", family, fallback)
}

func ThemeToCSS(theme *PanelTheme, basePath string) string {
	if theme == nil {
		return ""
	}
	var decls []string
	var fontFaces []string

	if theme.Tokens != nil {
		for k, v := range theme.Tokens {
			if v == nil || v == "" {
				continue
			}
			key := normalizeKey(k)
			if key == "--radius-scale" {
				continue
			}
			if key == "--fx-particles" && theme.Effects != nil && theme.Effects.Particles != nil && theme.Effects.Particles.On != nil {
				continue
			}
			if key == "--fx-hover-glow" && theme.Effects != nil && theme.Effects.HoverGlow != nil {
				continue
			}
			decls = append(decls, fmt.Sprintf("%s: %v;", key, v))
		}

		if rawScale, ok := theme.Tokens["--radius-scale"]; ok {
			var scale float64
			valid := false
			switch val := rawScale.(type) {
			case float64:
				scale = val
				valid = true
			case float32:
				scale = float64(val)
				valid = true
			case int:
				scale = float64(val)
				valid = true
			case int64:
				scale = float64(val)
				valid = true
			case string:
				if parsed, err := json.Number(val).Float64(); err == nil {
					scale = parsed
					valid = true
				}
			}
			if valid && scale > 0 {
				for key, base := range radiusRamp {
					decls = append(decls, fmt.Sprintf("%s: %dpx;", key, int(math.Round(base*scale))))
				}
			}
		}
	}

	if theme.Fonts != nil {
		if sans := resolveFont(theme.Fonts.Sans, "sans-serif", basePath, &fontFaces); sans != "" {
			decls = append(decls, fmt.Sprintf("--font-sans: %s;", sans))
		}
		if display := resolveFont(theme.Fonts.Display, "var(--font-sans)", basePath, &fontFaces); display != "" {
			decls = append(decls, fmt.Sprintf("--font-display: %s;", display))
		}
		if mono := resolveFont(theme.Fonts.Mono, "monospace", basePath, &fontFaces); mono != "" {
			decls = append(decls, fmt.Sprintf("--font-mono: %s;", mono))
		}
	}

	if theme.Background != nil {
		bg := theme.Background
		if bg.Type == "color" && bg.Color != "" {
			decls = append(decls, fmt.Sprintf("--bg-page: %s;", bg.Color))
			decls = append(decls, fmt.Sprintf("--bg-page-2: %s;", bg.Color))
		}
		if bg.Type == "image" && bg.AssetID != "" {
			decls = append(decls, fmt.Sprintf("--bg-image: url(\"%stheme/asset/%s\");", basePath, bg.AssetID))
		}
		if bg.Dim != nil {
			decls = append(decls, fmt.Sprintf("--bg-image-dim: %g;", *bg.Dim))
		}
		if bg.Blur != "" {
			decls = append(decls, fmt.Sprintf("--bg-image-blur: %s;", bg.Blur))
		}
	}

	if theme.Effects != nil {
		fx := theme.Effects
		if fx.Particles != nil {
			p := fx.Particles
			onVal := "on"
			if p.On != nil && !*p.On {
				onVal = "off"
			}
			decls = append(decls, fmt.Sprintf("--fx-particles: %s;", onVal))
			if p.Density != nil {
				decls = append(decls, fmt.Sprintf("--fx-particles-density: %g;", *p.Density))
			}
			if p.Speed != nil {
				decls = append(decls, fmt.Sprintf("--fx-particles-speed: %g;", *p.Speed))
			}
			if p.Color != "" {
				decls = append(decls, fmt.Sprintf("--fx-particles-color: %s;", p.Color))
			}
		}
		if fx.HoverGlow != nil {
			if !*fx.HoverGlow {
				decls = append(decls, "--hover-glow: none;")
				decls = append(decls, "--fx-hover-glow: off;")
			} else {
				decls = append(decls, "--fx-hover-glow: on;")
			}
		}
	}

	rootDecls := ""
	if len(decls) > 0 {
		rootDecls = fmt.Sprintf(":root{%s}", strings.Join(decls, ""))
	}

	return strings.Join(fontFaces, "") + rootDecls
}
