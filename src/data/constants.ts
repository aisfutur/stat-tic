/** Clés et versions de persistance, isolées pour éviter les imports croisés. */
export const STORAGE_KEY = 'barre.state.v1'
export const STATE_VERSION = 2

/**
 * Propriétaire unique des données.
 *
 * L'app n'a qu'un utilisateur, donc pas de compte : toutes les lignes portent
 * cet identifiant au lieu d'un `auth.users.id`. Doit rester identique à la
 * fonction `public.owner_id()` en base — voir la migration
 * `20261022150000_single_owner.sql`, qui explique aussi ce que ce choix coûte
 * en exposition.
 */
export const OWNER_ID = '00000000-0000-4000-8000-000000000001'
