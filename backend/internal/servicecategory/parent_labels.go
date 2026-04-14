package servicecategory

// ParentSlugLabelRu is a short group title for dashboard UI (aligned with docs/service-categories.md).
func ParentSlugLabelRu(parentSlug string) string {
	switch parentSlug {
	case "hair":
		return "Волосы"
	case "barbershop":
		return "Барбершоп"
	case "nails":
		return "Маникюр и педикюр"
	case "brows":
		return "Брови"
	case "lashes":
		return "Ресницы"
	case "permanent":
		return "Перманентный макияж"
	case "makeup":
		return "Макияж"
	case "skin":
		return "Уход за лицом"
	case "massage":
		return "Массаж"
	case "spa":
		return "SPA и уход за телом"
	case "depilation":
		return "Депиляция"
	case "tanning":
		return "Солярий"
	case "teeth":
		return "Отбеливание зубов"
	case "packages":
		return "Комплексы и пакеты"
	default:
		return parentSlug
	}
}
