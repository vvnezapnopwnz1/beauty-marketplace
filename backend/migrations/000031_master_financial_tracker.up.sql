-- Expense categories: masters create their own custom categories
CREATE TABLE master_expense_categories (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    master_profile_id UUID NOT NULL REFERENCES master_profiles(id) ON DELETE CASCADE,
    name              VARCHAR(100) NOT NULL,
    emoji             VARCHAR(10) DEFAULT '',
    sort_order        INT NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_master_expense_cat_owner
    ON master_expense_categories(master_profile_id, sort_order);

-- Expense entries: amounts, optional category, optional link to appointment
CREATE TABLE master_expenses (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    master_profile_id UUID NOT NULL REFERENCES master_profiles(id) ON DELETE CASCADE,
    category_id       UUID REFERENCES master_expense_categories(id) ON DELETE SET NULL,
    appointment_id    UUID REFERENCES appointments(id) ON DELETE SET NULL,
    amount_cents      INT NOT NULL CHECK (amount_cents >= 0),
    description       TEXT DEFAULT '',
    expense_date      DATE NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_master_expenses_owner_date
    ON master_expenses(master_profile_id, expense_date DESC);
CREATE INDEX idx_master_expenses_appointment
    ON master_expenses(appointment_id);
CREATE INDEX idx_master_expenses_category
    ON master_expenses(category_id);
