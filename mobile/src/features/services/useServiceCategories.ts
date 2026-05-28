import { useMemo, useState, useEffect } from "react";
import {
  fetchMasterServiceCategories,
  getMyMasterProfile,
} from "../../api/masterOnboarding";
import type { DashboardServiceCategoryGroup } from "../../api/types";

export function useServiceCategories() {
  const [allGroups, setAllGroups] = useState<DashboardServiceCategoryGroup[]>(
    [],
  );
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    try {
      const [cats, profile] = await Promise.all([
        fetchMasterServiceCategories(),
        getMyMasterProfile(),
      ]);
      setAllGroups(cats.groups);
      setSpecializations(profile.specializations ?? []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Не удалось загрузить категории услуг",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filteredGroups = useMemo(() => {
    if (specializations.length === 0) return allGroups;
    const filtered = allGroups.filter((g) =>
      specializations.includes(g.parentSlug),
    );
    return filtered.length > 0 ? filtered : allGroups;
  }, [allGroups, specializations]);

  return {
    filteredGroups,
    loading,
    error,
    reload: load,
  };
}
