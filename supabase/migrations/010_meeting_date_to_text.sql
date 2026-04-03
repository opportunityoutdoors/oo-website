-- Meeting date selected stores the slot label, not a timestamp
ALTER TABLE registrations ALTER COLUMN meeting_date_selected TYPE text;
