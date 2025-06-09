-- Migration: Add color column to couriers table
-- This allows each courier to have a specific color for badge display
-- Date: 2024-12-19

-- Add the color column to the couriers table
ALTER TABLE couriers
ADD COLUMN color VARCHAR(20) DEFAULT 'blue';

-- Add a comment to the column
COMMENT ON COLUMN couriers.color IS 'Color for courier badge display (e.g., blue, red, green, etc.)';

-- Update existing couriers with different colors
-- This ensures existing couriers get unique colors
UPDATE couriers
SET color = CASE
    WHEN id = (SELECT id FROM couriers WHERE aktif = true ORDER BY id LIMIT 1 OFFSET 0) THEN 'blue'
    WHEN id = (SELECT id FROM couriers WHERE aktif = true ORDER BY id LIMIT 1 OFFSET 1) THEN 'green'
    WHEN id = (SELECT id FROM couriers WHERE aktif = true ORDER BY id LIMIT 1 OFFSET 2) THEN 'red'
    WHEN id = (SELECT id FROM couriers WHERE aktif = true ORDER BY id LIMIT 1 OFFSET 3) THEN 'orange'
    WHEN id = (SELECT id FROM couriers WHERE aktif = true ORDER BY id LIMIT 1 OFFSET 4) THEN 'purple'
    WHEN id = (SELECT id FROM couriers WHERE aktif = true ORDER BY id LIMIT 1 OFFSET 5) THEN 'teal'
    WHEN id = (SELECT id FROM couriers WHERE aktif = true ORDER BY id LIMIT 1 OFFSET 6) THEN 'indigo'
    WHEN id = (SELECT id FROM couriers WHERE aktif = true ORDER BY id LIMIT 1 OFFSET 7) THEN 'pink'
    WHEN id = (SELECT id FROM couriers WHERE aktif = true ORDER BY id LIMIT 1 OFFSET 8) THEN 'yellow'
    WHEN id = (SELECT id FROM couriers WHERE aktif = true ORDER BY id LIMIT 1 OFFSET 9) THEN 'lime'
    WHEN id = (SELECT id FROM couriers WHERE aktif = true ORDER BY id LIMIT 1 OFFSET 10) THEN 'cyan'
    WHEN id = (SELECT id FROM couriers WHERE aktif = true ORDER BY id LIMIT 1 OFFSET 11) THEN 'azure'
    ELSE 'blue'
END
WHERE aktif = true;

-- Add a check constraint to ensure only valid Tabler colors are used
ALTER TABLE couriers
ADD CONSTRAINT check_color_valid
CHECK (color IN ('blue', 'azure', 'indigo', 'purple', 'pink', 'red', 'orange', 'yellow', 'lime', 'green', 'teal', 'cyan', 'dark', 'muted'));

-- Create an index on the color column for better performance
CREATE INDEX idx_couriers_color ON couriers(color);
