-- ============================================================
-- Seed quiz questions for IT, Business, Biology
-- Run this AFTER creating your first teacher account
-- Replace 'YOUR_TEACHER_USER_ID' with your actual user ID
-- from Supabase → Authentication → Users
-- ============================================================

-- Get subject IDs
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

  -- Use the first user with teacher or admin role as the creator
  SELECT id INTO teacher_id FROM public.profiles WHERE role IN ('teacher', 'admin') LIMIT 1;

  IF teacher_id IS NULL THEN
    RAISE EXCEPTION 'No teacher/admin user found. Create a teacher account first.';
  END IF;

  -- ── IT Questions ────────────────────────────────────────────
  INSERT INTO public.quiz_questions (subject_id, question, options, correct_answer, explanation, difficulty, created_by) VALUES
  (it_id, 'What does CPU stand for?',
    '["Central Processing Unit", "Computer Personal Unit", "Central Program Utility", "Core Processing Unit"]',
    0, 'CPU stands for Central Processing Unit — the primary component that executes instructions in a computer.', 'easy', teacher_id),

  (it_id, 'Which of the following is a type of primary storage?',
    '["Hard Disk Drive", "RAM", "SSD", "USB Drive"]',
    1, 'RAM (Random Access Memory) is primary storage — it holds data the CPU is currently using. HDDs and SSDs are secondary storage.', 'easy', teacher_id),

  (it_id, 'What is the purpose of an operating system?',
    '["To browse the internet", "To manage hardware and software resources", "To create documents", "To compile code"]',
    1, 'An operating system manages hardware resources, provides a user interface, and allows software applications to run.', 'medium', teacher_id),

  (it_id, 'Which layer of the OSI model is responsible for routing packets?',
    '["Data Link Layer", "Transport Layer", "Network Layer", "Session Layer"]',
    2, 'The Network Layer (Layer 3) is responsible for logical addressing and routing packets between networks.', 'hard', teacher_id),

  (it_id, 'What does SQL stand for?',
    '["Structured Query Language", "Simple Query Logic", "System Query Language", "Standard Query Layout"]',
    0, 'SQL stands for Structured Query Language — used to manage and query relational databases.', 'easy', teacher_id),

  -- ── Business Questions ──────────────────────────────────────
  (bus_id, 'What does GDP stand for?',
    '["Gross Domestic Product", "General Demand Price", "Gross Demand Product", "General Domestic Production"]',
    0, 'GDP (Gross Domestic Product) is the total monetary value of all goods and services produced in a country within a given period.', 'easy', teacher_id),

  (bus_id, 'Which of the following is an example of a fixed cost?',
    '["Raw materials", "Commission paid to sales staff", "Factory rent", "Electricity used in production"]',
    2, 'Fixed costs do not change with output. Rent is the same regardless of how many units are produced.', 'easy', teacher_id),

  (bus_id, 'What is the purpose of a break-even analysis?',
    '["To calculate maximum profit", "To identify the output level where total revenue equals total costs", "To set the selling price", "To forecast future sales"]',
    1, 'Break-even analysis finds the point where total revenue equals total costs — at this output the business makes neither a profit nor a loss.', 'medium', teacher_id),

  (bus_id, 'Which marketing theory describes product, price, place, and promotion?',
    '["Ansoff Matrix", "Boston Matrix", "The 4Ps Marketing Mix", "Porter''s Five Forces"]',
    2, 'The 4Ps Marketing Mix (Product, Price, Place, Promotion) is a framework used to develop effective marketing strategies.', 'medium', teacher_id),

  (bus_id, 'A business has a current ratio of 0.8. What does this indicate?',
    '["The business is highly profitable", "The business may struggle to meet short-term liabilities", "The business has more assets than liabilities", "The business has high gearing"]',
    1, 'A current ratio below 1 means current liabilities exceed current assets, suggesting potential liquidity problems in the short term.', 'hard', teacher_id),

  -- ── Biology Questions ───────────────────────────────────────
  (bio_id, 'What is the powerhouse of the cell?',
    '["Nucleus", "Ribosome", "Mitochondria", "Golgi apparatus"]',
    2, 'Mitochondria are the site of aerobic respiration, producing ATP — the cell''s energy currency.', 'easy', teacher_id),

  (bio_id, 'Which bases pair together in DNA?',
    '["Adenine-Cytosine and Guanine-Thymine", "Adenine-Thymine and Guanine-Cytosine", "Adenine-Guanine and Cytosine-Thymine", "Adenine-Uracil and Guanine-Cytosine"]',
    1, 'In DNA, Adenine pairs with Thymine (A-T) and Guanine pairs with Cytosine (G-C) via complementary base pairing.', 'medium', teacher_id),

  (bio_id, 'What is the role of mRNA in protein synthesis?',
    '["It carries amino acids to the ribosome", "It carries the genetic code from DNA to the ribosome", "It catalyses the formation of peptide bonds", "It unwinds the DNA double helix"]',
    1, 'mRNA (messenger RNA) carries the genetic code from the nucleus to the ribosome where proteins are synthesised.', 'medium', teacher_id),

  (bio_id, 'What type of mutation results in all subsequent codons being misread?',
    '["Substitution mutation", "Nonsense mutation", "Frameshift mutation", "Silent mutation"]',
    2, 'A frameshift mutation (insertion or deletion of bases not in multiples of 3) shifts the reading frame, affecting all subsequent codons.', 'hard', teacher_id),

  (bio_id, 'Which process produces genetically identical cells for growth and repair?',
    '["Meiosis", "Mitosis", "Fertilisation", "Transcription"]',
    1, 'Mitosis produces two genetically identical daughter cells and is used for growth, repair, and asexual reproduction.', 'easy', teacher_id);

  RAISE NOTICE 'Successfully inserted 15 quiz questions across IT, Business, and Biology.';
END $$;
