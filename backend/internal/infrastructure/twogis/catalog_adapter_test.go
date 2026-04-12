package twogis

import (
	"encoding/json"
	"testing"
)

func TestParsePointJSON_stringLonLat(t *testing.T) {
	// Как в доке 2GIS: point=37.624186,55.754285 (lon, lat).
	raw, _ := json.Marshal("37.624186,55.754285")
	lat, lon, ok := parsePointJSON(raw)
	if !ok {
		t.Fatal("expected ok")
	}
	if lon < 37.6 || lon > 37.7 || lat < 55.7 || lat > 55.8 {
		t.Fatalf("unexpected lat/lon: %v, %v", lat, lon)
	}
}

func TestParsePointJSON_geoJSONPoint(t *testing.T) {
	raw := json.RawMessage(`{"type":"Point","coordinates":[37.62,55.75]}`)
	lat, lon, ok := parsePointJSON(raw)
	if !ok {
		t.Fatal("expected ok")
	}
	if lat != 55.75 || lon != 37.62 {
		t.Fatalf("got lat=%v lon=%v", lat, lon)
	}
}

func TestParsePointJSON_objectLatLon(t *testing.T) {
	raw := json.RawMessage(`{"lat":55.75,"lon":37.62}`)
	lat, lon, ok := parsePointJSON(raw)
	if !ok {
		t.Fatal("expected ok")
	}
	if lat != 55.75 || lon != 37.62 {
		t.Fatalf("got lat=%v lon=%v", lat, lon)
	}
}

func TestParsePointJSON_geoJSONMustNotReturnZeroTrue(t *testing.T) {
	raw := json.RawMessage(`{"type":"Point","coordinates":[37.62,55.75]}`)
	// Старый баг: разбор как {lat,lon} давал 0,0 без ошибки.
	var o struct {
		Lat float64 `json:"lat"`
		Lon float64 `json:"lon"`
	}
	_ = json.Unmarshal(raw, &o)
	if o.Lat != 0 || o.Lon != 0 {
		t.Fatal("sanity: GeoJSON should not fill lat/lon struct")
	}
	lat, lon, ok := parsePointJSON(raw)
	if !ok || lat == 0 || lon == 0 {
		t.Fatalf("parsePointJSON failed: ok=%v lat=%v lon=%v", ok, lat, lon)
	}
}
