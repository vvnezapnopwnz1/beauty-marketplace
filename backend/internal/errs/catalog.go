package errs

import "errors"

// CatalogAPIKeyMissing is returned when a catalog provider (e.g. 2GIS) has no API key configured.
var CatalogAPIKeyMissing = errors.New("catalog API key is not configured")
