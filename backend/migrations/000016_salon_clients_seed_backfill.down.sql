UPDATE appointments SET salon_client_id = NULL WHERE salon_client_id IS NOT NULL;

DELETE FROM salon_client_tags WHERE salon_id IS NULL AND name IN ('VIP','Постоянный','Проблемный','Новый','Требует внимания');
