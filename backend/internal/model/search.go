package model

// SearchResultItem is one row in unified search: 2GIS data plus optional platform enrichment.
type SearchResultItem struct {
	ExternalID    string       `json:"externalId"`
	Name          string       `json:"name"`
	Address       string       `json:"address,omitempty"`
	Lat           float64      `json:"lat"`
	Lon           float64      `json:"lon"`
	PhotoURL      *string      `json:"photoUrl,omitempty"`
	Rating        *float64     `json:"rating,omitempty"`
	ReviewCount   *int         `json:"reviewCount,omitempty"`
	RubricNames   []string     `json:"rubricNames,omitempty"`
	DistanceKm    float64      `json:"distanceKm"`
	Category      string       `json:"category"`
	SalonID       *string      `json:"salonId,omitempty"`
	OnlineBooking bool         `json:"onlineBooking"`
	Services      []ServiceDTO `json:"services,omitempty"`
}

// SearchResult is the unified search API payload.
type SearchResult struct {
	Items []SearchResultItem `json:"items"`
	Total int                `json:"total"`
}

// SearchInput is service-layer input for unified search.
type SearchInput struct {
	UserLat    *float64 // when nil, DistanceKm is not computed (0); search center still uses default Moscow if needed
	UserLon    *float64
	RegionID   int
	Category   string
	Sort       string // "popular" (default), "nearby", "rating"
	OpenNow    bool   // pass work_time=now to 2GIS
	HighRating bool   // pass has_rating=true + post-filter rating >= 4.5
	OnlineOnly bool   // post-filter: only enriched items with online_booking_enabled
	Page       int
	PageSize   int
}
