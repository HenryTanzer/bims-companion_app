-- ============================================================
-- Seed flashcards for IT, Business, Biology
-- ============================================================
DO $$
DECLARE
  it_id uuid;
  bus_id uuid;
  bio_id uuid;
  teacher_id uuid;
BEGIN
  SELECT id INTO it_id FROM public.subjects WHERE name = 'IT';
  SELECT id INTO bus_id FROM public.subjects WHERE name = 'Business';
  SELECT id INTO bio_id FROM public.subjects WHERE name = 'Biology';
  SELECT id INTO teacher_id FROM public.profiles WHERE role IN ('teacher', 'admin') LIMIT 1;

  -- ── IT Flashcards ────────────────────────────────────────────
  INSERT INTO public.flashcards (subject_id, term, definition, created_by) VALUES
  (it_id, 'RAM', 'Random Access Memory — volatile primary storage that temporarily holds data the CPU is currently processing. Lost when power is removed.', teacher_id),
  (it_id, 'CPU', 'Central Processing Unit — the main chip that executes program instructions. Consists of ALU, CU, and registers.', teacher_id),
  (it_id, 'Binary', 'A base-2 number system using only 0s and 1s. The fundamental language of all digital computers.', teacher_id),
  (it_id, 'Bandwidth', 'The maximum rate of data transfer across a network, measured in bits per second (bps).', teacher_id),
  (it_id, 'Encryption', 'The process of converting data into a coded format to prevent unauthorised access. Requires a key to decrypt.', teacher_id),
  (it_id, 'Algorithm', 'A finite, step-by-step set of instructions designed to solve a specific problem or complete a task.', teacher_id),
  (it_id, 'Cache Memory', 'A small, very fast type of memory located close to the CPU that stores frequently accessed data to reduce processing time.', teacher_id),
  (it_id, 'IP Address', 'Internet Protocol Address — a unique numerical label assigned to each device on a network for identification and location addressing.', teacher_id),

  -- ── Business Flashcards ──────────────────────────────────────
  (bus_id, 'Fixed Costs', 'Costs that do not change with the level of output, e.g. rent, salaries. These must be paid even if nothing is produced.', teacher_id),
  (bus_id, 'Variable Costs', 'Costs that change directly with the level of output, e.g. raw materials and direct labour. Higher output means higher variable costs.', teacher_id),
  (bus_id, 'Break-Even Point', 'The level of output at which total revenue equals total costs. The business makes neither a profit nor a loss at this point.', teacher_id),
  (bus_id, 'Contribution', 'Selling price minus variable cost per unit. Shows how much each unit sold contributes towards covering fixed costs and then profit.', teacher_id),
  (bus_id, 'Market Share', 'The percentage of total sales in a market held by one business. Calculated as (firm''s sales ÷ total market sales) × 100.', teacher_id),
  (bus_id, 'Cash Flow', 'The movement of money into and out of a business over a period of time. Positive cash flow means more money in than out.', teacher_id),
  (bus_id, 'Economies of Scale', 'The cost advantages a business gains as it increases its scale of production, leading to a lower average cost per unit.', teacher_id),
  (bus_id, 'Profit Margin', 'Profit as a percentage of revenue. Shows how much of each pound of sales the business keeps as profit after costs are deducted.', teacher_id),

  -- ── Biology Flashcards ───────────────────────────────────────
  (bio_id, 'Mitosis', 'A type of cell division producing two genetically identical daughter cells. Used for growth, repair, and asexual reproduction.', teacher_id),
  (bio_id, 'Meiosis', 'A type of cell division producing four genetically unique haploid cells (gametes). Involves two divisions and crossing over.', teacher_id),
  (bio_id, 'ATP', 'Adenosine Triphosphate — the universal energy currency of cells. Released when the bond between the 2nd and 3rd phosphate groups is broken.', teacher_id),
  (bio_id, 'DNA', 'Deoxyribonucleic Acid — a double-stranded helix molecule carrying the genetic instructions for development, functioning, and reproduction of all life.', teacher_id),
  (bio_id, 'Enzyme', 'A biological catalyst (protein) that speeds up chemical reactions without being consumed. Has an active site with a specific shape.', teacher_id),
  (bio_id, 'Homeostasis', 'The maintenance of a constant internal environment in the body, e.g. blood glucose level, body temperature, and water potential.', teacher_id),
  (bio_id, 'Transcription', 'The first stage of protein synthesis where mRNA is synthesised from a DNA template in the nucleus using RNA polymerase.', teacher_id),
  (bio_id, 'Natural Selection', 'The process by which organisms with favourable adaptations survive and reproduce more successfully, passing traits to offspring over generations.', teacher_id);

  RAISE NOTICE 'Successfully inserted 24 flashcards across IT, Business, and Biology.';
END $$;
