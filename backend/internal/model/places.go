package model

// PlacesSearchInput is provider-agnostic nearby / text search for branches.
type PlacesSearchInput struct {
	Query       string
	Category    string // optional: our CategoryId ("nails", "hair", etc.)
	RegionID    int    // optional: 2GIS region id used with rubric filters
	RubricIDs   []int  // optional: explicit rubric ids for strict category filtering
	Lat         float64
	Lon         float64
	RadiusM     int
	Locale      string
	Page        int
	PageSize    int
	HasRating   bool
	HasReviews  bool
	HasPhotos   bool
	WorkTimeNow bool
	Sort        string // "popular", "nearby", "rating" — mapped to 2GIS sort param
}

// PlacesSearchResult is the normalized catalog response (not persisted).
type PlacesSearchResult struct {
	Items []PlaceItem       `json:"items"`
	Total int               `json:"total"`
	Meta  *PlacesSearchMeta `json:"meta,omitempty"`
}

// PlacesSearchMeta captures lightweight diagnostics for ranking quality.
type PlacesSearchMeta struct {
	RegionID         int    `json:"regionId,omitempty"`
	RubricFilterUsed bool   `json:"rubricFilterUsed,omitempty"`
	FallbackMode     string `json:"fallbackMode,omitempty"` // "", "rubric_only"
}

// PlaceItem is one branch/organization from a catalog provider.
type PlaceItem struct {
	ExternalID  string   `json:"externalId"`
	Name        string   `json:"name"`
	Address     string   `json:"address,omitempty"`
	Lat         float64  `json:"lat"`
	Lon         float64  `json:"lon"`
	PhotoURL    *string  `json:"photoUrl,omitempty"`
	Rating      *float64 `json:"rating,omitempty"`
	ReviewCount *int     `json:"reviewCount,omitempty"`
	RubricNames []string `json:"rubricNames,omitempty"`
}

// PlaceContact is a phone, URL, or other contact line from a catalog.
type PlaceContact struct {
	Type  string `json:"type"`
	Value string `json:"value"`
	Label string `json:"label,omitempty"`
}

// PlaceScheduleDay is simplified working hours for one weekday key (Mon, Tue, ...).
type PlaceScheduleDay struct {
	Day          string `json:"day"`
	WorkingHours []struct {
		From string `json:"from"`
		To   string `json:"to"`
	} `json:"workingHours,omitempty"`
	Is247   bool   `json:"is247,omitempty"`
	Comment string `json:"comment,omitempty"`
}

// PlaceDetail is a full branch card from a catalog provider (e.g. 2GIS byid).
type PlaceDetail struct {
	ExternalID      string             `json:"externalId"`
	Name            string             `json:"name"`
	Address         string             `json:"address,omitempty"`
	FullAddressName string             `json:"fullAddressName,omitempty"`
	Lat             float64            `json:"lat"`
	Lon             float64            `json:"lon"`
	Description     string             `json:"description,omitempty"`
	PhotoURLs       []string           `json:"photoUrls,omitempty"`
	Rating          *float64           `json:"rating,omitempty"`
	ReviewCount     *int               `json:"reviewCount,omitempty"`
	RubricNames     []string           `json:"rubricNames,omitempty"`
	OrgName         string             `json:"orgName,omitempty"`
	BrandName       string             `json:"brandName,omitempty"`
	ScheduleComment string             `json:"scheduleComment,omitempty"`
	Schedule247     bool               `json:"schedule247,omitempty"`
	WeeklySchedule  []PlaceScheduleDay `json:"weeklySchedule,omitempty"`
	Contacts        []PlaceContact     `json:"contacts,omitempty"`
	TwoGisAlias     string             `json:"twoGisAlias,omitempty"`
}
