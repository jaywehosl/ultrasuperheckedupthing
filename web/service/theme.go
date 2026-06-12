package service

import (
	"errors"
	"os"
	"path/filepath"
	"strings"

	"github.com/mhsanaei/3x-ui/v3/config"
	"github.com/mhsanaei/3x-ui/v3/util/random"
)

// ThemeService stores and serves user-uploaded Appearance assets (custom
// background images and fonts) under <db folder>/theme/. The panelTheme JSON
// references them by id; they're served publicly so login + sub can use them.
type ThemeService struct{}

const (
	maxThemeImageBytes = 5 << 20 // 5 MiB
	maxThemeFontBytes  = 3 << 20 // 3 MiB
)

var themeImageTypes = map[string]string{
	".png":  "image/png",
	".jpg":  "image/jpeg",
	".jpeg": "image/jpeg",
	".webp": "image/webp",
}

var themeFontTypes = map[string]string{
	".woff2": "font/woff2",
	".woff":  "font/woff",
	".ttf":   "font/ttf",
	".otf":   "font/otf",
}

func themeAssetDir() string {
	return filepath.Join(config.GetDBFolderPath(), "theme")
}

// SaveThemeAsset validates an uploaded asset (by kind = "image" | "font") and
// stores it, returning the asset id ("<random><ext>") used in URLs.
func (s *ThemeService) SaveThemeAsset(kind, filename string, data []byte) (string, error) {
	ext := strings.ToLower(filepath.Ext(filename))

	var allowed map[string]string
	var maxBytes int
	switch kind {
	case "image":
		allowed, maxBytes = themeImageTypes, maxThemeImageBytes
	case "font":
		allowed, maxBytes = themeFontTypes, maxThemeFontBytes
	default:
		return "", errors.New("unknown asset kind")
	}

	if _, ok := allowed[ext]; !ok {
		return "", errors.New("unsupported file type")
	}
	if len(data) == 0 {
		return "", errors.New("empty file")
	}
	if len(data) > maxBytes {
		return "", errors.New("file is too large")
	}

	if err := os.MkdirAll(themeAssetDir(), 0o750); err != nil {
		return "", err
	}
	id := random.Seq(16) + ext
	if err := os.WriteFile(filepath.Join(themeAssetDir(), id), data, 0o640); err != nil {
		return "", err
	}
	return id, nil
}

// ResolveThemeAsset maps an asset id to its on-disk path + content type. The id
// is constrained to a safe shape to prevent path traversal.
func (s *ThemeService) ResolveThemeAsset(id string) (string, string, error) {
	if id == "" || strings.ContainsAny(id, `/\`) || strings.Contains(id, "..") {
		return "", "", errors.New("invalid asset id")
	}
	ext := strings.ToLower(filepath.Ext(id))
	contentType := themeImageTypes[ext]
	if contentType == "" {
		contentType = themeFontTypes[ext]
	}
	if contentType == "" {
		return "", "", errors.New("unsupported asset")
	}
	path := filepath.Join(themeAssetDir(), filepath.Base(id))
	if _, err := os.Stat(path); err != nil {
		return "", "", err
	}
	return path, contentType, nil
}
