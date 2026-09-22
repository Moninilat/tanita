CREATE TABLE profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    birth_date date,
    height_cm numeric(6,2),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT profiles_name_not_blank CHECK (btrim(name) <> ''),
    CONSTRAINT profiles_height_positive CHECK (height_cm IS NULL OR height_cm > 0)
);

CREATE TABLE locations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT locations_name_not_blank CHECK (btrim(name) <> '')
);

CREATE TABLE measurements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id uuid NOT NULL,
    location_id uuid NOT NULL,
    measured_at timestamptz NOT NULL,
    entry_method text NOT NULL,
    notes text,
    weight_kg numeric(7,3),
    bmr_kcal numeric(7,2),
    bone_mass_kg numeric(6,3),
    visceral_fat_rating numeric(5,2),
    body_fat_pct numeric(5,2),
    muscle_mass_kg numeric(7,3),
    muscle_quality_score smallint,
    physique_rating smallint,
    body_water_pct numeric(5,2),
    heart_rate_bpm integer,
    metabolic_age integer,
    abdomen_cm numeric(6,2),
    flexed_arm_cm numeric(6,2),
    arm_cm numeric(6,2),
    waist_cm numeric(6,2),
    hip_cm numeric(6,2),
    thigh_cm numeric(6,2),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT measurements_profile_id_fkey
        FOREIGN KEY (profile_id)
        REFERENCES profiles(id)
        ON DELETE RESTRICT,
    CONSTRAINT measurements_location_id_fkey
        FOREIGN KEY (location_id)
        REFERENCES locations(id)
        ON DELETE RESTRICT,
    CONSTRAINT measurements_entry_method_check
        CHECK (entry_method IN ('manual', 'import')),
    CONSTRAINT measurements_weight_positive
        CHECK (weight_kg IS NULL OR weight_kg > 0),
    CONSTRAINT measurements_bmr_positive
        CHECK (bmr_kcal IS NULL OR bmr_kcal > 0),
    CONSTRAINT measurements_bone_mass_positive
        CHECK (bone_mass_kg IS NULL OR bone_mass_kg > 0),
    CONSTRAINT measurements_muscle_mass_positive
        CHECK (muscle_mass_kg IS NULL OR muscle_mass_kg > 0),
    CONSTRAINT measurements_muscle_quality_positive
        CHECK (muscle_quality_score IS NULL OR muscle_quality_score > 0),
    CONSTRAINT measurements_physique_rating_positive
        CHECK (physique_rating IS NULL OR physique_rating > 0),
    CONSTRAINT measurements_heart_rate_positive
        CHECK (heart_rate_bpm IS NULL OR heart_rate_bpm > 0),
    CONSTRAINT measurements_metabolic_age_positive
        CHECK (metabolic_age IS NULL OR metabolic_age > 0),
    CONSTRAINT measurements_abdomen_positive
        CHECK (abdomen_cm IS NULL OR abdomen_cm > 0),
    CONSTRAINT measurements_flexed_arm_positive
        CHECK (flexed_arm_cm IS NULL OR flexed_arm_cm > 0),
    CONSTRAINT measurements_arm_positive
        CHECK (arm_cm IS NULL OR arm_cm > 0),
    CONSTRAINT measurements_waist_positive
        CHECK (waist_cm IS NULL OR waist_cm > 0),
    CONSTRAINT measurements_hip_positive
        CHECK (hip_cm IS NULL OR hip_cm > 0),
    CONSTRAINT measurements_thigh_positive
        CHECK (thigh_cm IS NULL OR thigh_cm > 0),
    CONSTRAINT measurements_body_fat_pct_range
        CHECK (body_fat_pct IS NULL OR body_fat_pct BETWEEN 0 AND 100),
    CONSTRAINT measurements_body_water_pct_range
        CHECK (body_water_pct IS NULL OR body_water_pct BETWEEN 0 AND 100),
    CONSTRAINT measurements_visceral_fat_rating_range
        CHECK (visceral_fat_rating IS NULL OR visceral_fat_rating BETWEEN 1 AND 59)
);

CREATE UNIQUE INDEX locations_name_unique_ci
    ON locations (lower(trim(name)));

CREATE INDEX measurements_profile_measured_at_id_idx
    ON measurements (profile_id, measured_at, id);

CREATE INDEX measurements_location_measured_at_id_idx
    ON measurements (location_id, measured_at, id);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_set_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER locations_set_updated_at
    BEFORE UPDATE ON locations
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER measurements_set_updated_at
    BEFORE UPDATE ON measurements
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
