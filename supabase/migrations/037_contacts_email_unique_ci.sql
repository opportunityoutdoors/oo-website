-- One contact per email address, ignoring letter case.
--
-- The existing contacts_email_unique index is case-sensitive, which let "Cameronbissell14@"
-- and "cameronbissell14@" become two people. The four such pairs were merged with
-- merge_contacts() on 2026-10-14 before this ran. The form now looks contacts up without
-- regard to case (src/lib/contacts/find.ts), so this index only fires if something
-- bypasses that lookup, and then it fails loudly instead of making a duplicate.

create unique index contacts_email_lower_unique on contacts (lower(email)) where email is not null;
