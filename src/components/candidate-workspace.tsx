"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient, type Session } from "@supabase/supabase-js";
import {
  emptyProfile,
  type CandidateProfile,
  type Experience,
} from "@/lib/profile";
import { families, seniorities } from "@/lib/tech";
import type { rankMatches } from "@/lib/matching";
import { JobCard } from "./job-card";

type Results = ReturnType<typeof rankMatches> & { profileRevision: number };
export function CandidateWorkspace({
  url,
  publishableKey,
  extractionEnabled,
  privacyUrl,
  providerName,
  passwordSignupReady,
}: {
  url: string;
  publishableKey: string;
  extractionEnabled: boolean;
  privacyUrl: string;
  providerName: string;
  passwordSignupReady: boolean;
}) {
  const auth = useMemo(
    () => createClient(url, publishableKey),
    [url, publishableKey],
  );
  const [session, setSession] = useState<Session | null>(null),
    [ready, setReady] = useState(false);
  const owner = useRef<string | undefined>(undefined);
  const [loadedOwner, setLoadedOwner] = useState<string | undefined>(undefined);
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [creatingAccount, setCreatingAccount] = useState(false),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const [profile, setProfile] = useState<CandidateProfile>(emptyProfile),
    [saved, setSaved] = useState(false),
    [editing, setEditing] = useState(true);
  const [results, setResults] = useState<Results | null>(null),
    [days, setDays] = useState(30);
  const [consent, setConsent] = useState(false),
    [text, setText] = useState(""),
    [file, setFile] = useState<File | null>(null);
  useEffect(() => {
    const { data } = auth.auth.onAuthStateChange((_event, s) => {
      if (owner.current !== s?.user.id) {
        owner.current = s?.user.id;
        setLoadedOwner(undefined);
        setBusy(false);
        setMessage("");
        setProfile(emptyProfile());
        setResults(null);
        setSaved(false);
        setEditing(true);
        setText("");
        setFile(null);
        setConsent(false);
        setPassword("");
      }
      setSession(s);
      setReady(true);
    });
    return () => {
      owner.current = undefined;
      data.subscription.unsubscribe();
    };
  }, [auth]);
  async function api(path: string, options: RequestInit = {}) {
    const expectedOwner = session?.user.id;
    const { data } = await auth.auth.getSession();
    if (
      !data.session ||
      data.session.user.id !== expectedOwner ||
      owner.current !== expectedOwner
    )
      throw new Error("Reconnectez-vous pour continuer.");
    const response = await fetch(path, {
      ...options,
      cache: "no-store",
      headers: {
        ...options.headers,
        Authorization: `Bearer ${data.session.access_token}`,
      },
    });
    const body = await response.json();
    if (owner.current !== expectedOwner)
      throw new Error("La session a changé.");
    if (!response.ok) throw new Error(body.error || "Opération indisponible.");
    return body;
  }
  useEffect(() => {
    let cancelled = false;
    setProfile(emptyProfile());
    setResults(null);
    setSaved(false);
    setEditing(true);
    setText("");
    setFile(null);
    setConsent(false);
    if (session)
      api("/api/profile")
        .then((data) => {
          if (!cancelled) {
            if (data.profile) {
              setProfile(data.profile);
              setSaved(true);
            }
            setLoadedOwner(session.user.id);
          }
        })
        .catch((e) => {
          if (!cancelled) setMessage(e.message);
        });
    return () => {
      cancelled = true;
    };
    // Token refreshes must not overwrite an unsaved draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.id]);
  async function perform(action: () => Promise<void>) {
    const actionOwner = owner.current;
    setBusy(true);
    setMessage("");
    try {
      await action();
    } catch (e) {
      if (owner.current === actionOwner)
        setMessage(e instanceof Error ? e.message : "Opération indisponible.");
    } finally {
      if (owner.current === actionOwner) setBusy(false);
    }
  }
  async function matches(page = 1, selectedDays = days) {
    const data = await api(`/api/matches?days=${selectedDays}&page=${page}`);
    setResults(data);
    setDays(selectedDays);
    setEditing(false);
  }
  function preference(
    name: keyof CandidateProfile["preferences"],
    value: string,
  ) {
    setProfile((p) => {
      const pref = p.preferences[name];
      return {
        ...p,
        preferences: {
          ...p.preferences,
          [name]: {
            ...pref,
            values: pref.values.includes(value)
              ? pref.values.filter((v) => v !== value)
              : [...pref.values, value],
          },
        },
      };
    });
  }
  if (!ready) return <p role="status">Chargement de votre espace…</p>;
  if (!session)
    return (
      <section className="profile-panel">
        <h2>Votre espace privé</h2>
        <p>
          Connectez-vous avec votre email et votre mot de passe. Votre profil
          reste accessible uniquement depuis votre compte.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void perform(async () => {
              if (creatingAccount && !passwordSignupReady)
                throw new Error("Les inscriptions sont en préparation.");
              const { data, error } = creatingAccount
                ? await auth.auth.signUp({ email: email.trim(), password })
                : await auth.auth.signInWithPassword({
                    email: email.trim(),
                    password,
                  });
              if (error)
                throw new Error(
                  "Connexion ou inscription impossible. Vérifiez vos informations et réessayez.",
                );
              setPassword("");
              if (!data.session)
                throw new Error(
                  "L'accès immédiat est indisponible. Les inscriptions doivent être configurées par l'équipe Virtus.",
                );
            });
          }}
        >
          <label>
            Email
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            Mot de passe{creatingAccount ? " (12 caractères minimum)" : ""}
            <input
              type="password"
              autoComplete={
                creatingAccount ? "new-password" : "current-password"
              }
              minLength={creatingAccount ? 12 : undefined}
              maxLength={128}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <button className="primary-button" disabled={busy}>
            {creatingAccount ? "Créer mon compte" : "Se connecter"}
          </button>
        </form>
        {passwordSignupReady ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setCreatingAccount(!creatingAccount);
              setPassword("");
              setMessage("");
            }}
          >
            {creatingAccount
              ? "J'ai déjà un compte"
              : "Créer un compte sans email de confirmation"}
          </button>
        ) : (
          <p>Les nouvelles inscriptions sont en préparation.</p>
        )}
        <p role="status">{message}</p>
        <Link href="/tech">Explorer les offres sans compte →</Link>
      </section>
    );
  if (loadedOwner !== session.user.id)
    return (
      <section className="profile-panel">
        <p role="status">{message || "Chargement de votre profil…"}</p>
        {message && (
          <button onClick={() => window.location.reload()}>Réessayer</button>
        )}
      </section>
    );
  return (
    <div className="candidate-workspace">
      <div className="profile-toolbar">
        <span>{session.user.email}</span>
        <button
          disabled={busy}
          onClick={() =>
            void perform(async () => {
              await auth.auth.signOut();
            })
          }
        >
          Se déconnecter
        </button>
      </div>
      <ol className="profile-steps">
        <li>1. Importer ou saisir</li>
        <li>2. Confirmer mon profil</li>
        <li>3. Explorer mes correspondances</li>
      </ol>
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
      {editing ? (
        <>
          <section className="profile-panel">
            <h2>1. Votre CV, pour commencer</h2>
            <p>
              PDF texte ou DOCX · 4 Mo maximum · 30 000 caractères. Le fichier
              et son texte complet ne sont pas enregistrés par Virtus.
            </p>
            {extractionEnabled ? (
              <>
                <label>
                  Choisir un fichier
                  <input
                    type="file"
                    accept=".pdf,.docx"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                </label>
                <label>
                  Ou coller le texte de votre CV
                  <textarea
                    rows={5}
                    maxLength={30000}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                  />
                </label>
                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                  />{" "}
                  J'accepte la transmission du texte de mon CV au service Llama
                  via {providerName} pour préparer mon profil.
                </label>
                <p>
                  <a
                    href={privacyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Traitement et conservation chez le fournisseur ↗
                  </a>
                  . Retirez les coordonnées et informations personnelles
                  inutiles avant l'import.
                </p>
                <button
                  className="primary-button"
                  disabled={busy || !consent || (!file && !text.trim())}
                  onClick={() =>
                    void perform(async () => {
                      const body = new FormData();
                      if (file) body.set("file", file);
                      const data = await api("/api/profile/extract", {
                        method: "POST",
                        headers: {
                          "x-cv-consent": "accepted",
                          ...(!file
                            ? { "Content-Type": "application/json" }
                            : {}),
                        },
                        body: file ? body : JSON.stringify({ text }),
                      });
                      setProfile(data.profile);
                      setText("");
                      setFile(null);
                      setMessage(
                        "Profil extrait : vérifiez et complétez les champs avant de confirmer. Votre ancien profil reste enregistré jusque-là.",
                      );
                    })
                  }
                >
                  {busy ? "Traitement…" : "Préparer mon profil"}
                </button>
                <p className="filter-help">
                  5 tentatives par jour. Si l'import est indisponible, complétez
                  les champs ci-dessous.
                </p>
              </>
            ) : (
              <p className="notice">
                L'import assisté est en préparation. Vous pouvez remplir votre
                profil ci-dessous et obtenir vos correspondances.
              </p>
            )}
          </section>
          <form
            className="profile-panel"
            onSubmit={(e) => {
              e.preventDefault();
              void perform(async () => {
                await api("/api/profile", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(profile),
                });
                setSaved(true);
                setResults(null);
                await matches();
              });
            }}
          >
            <h2>2. Confirmez votre profil</h2>
            <p>
              Corrigez les informations et choisissez ce qui compte pour votre
              prochain poste.
            </p>
            <label>
              Compétences et technologies (une par ligne)
              <textarea
                rows={4}
                value={profile.skills.join("\n")}
                onChange={(e) =>
                  setProfile((p) => ({
                    ...p,
                    skills: e.target.value.split("\n"),
                  }))
                }
              />
            </label>
            <fieldset>
              <legend>Expériences</legend>
              {profile.history.map((h, i) => (
                <div className="experience-row" key={i}>
                  {(
                    [
                      ["role", "Poste"],
                      ["organization", "Entreprise"],
                      ["start", "Début"],
                      ["end", "Fin (vide si en cours)"],
                    ] as const
                  ).map(([k, label]) => (
                    <label key={k}>
                      {label}
                      <input
                        type={k === "start" || k === "end" ? "month" : "text"}
                        value={h[k]}
                        maxLength={300}
                        onChange={(e) =>
                          setProfile((p) => ({
                            ...p,
                            history: p.history.map((old, n) =>
                              n === i ? { ...old, [k]: e.target.value } : old,
                            ),
                          }))
                        }
                      />
                    </label>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setProfile((p) => ({
                        ...p,
                        history: p.history.filter((_, n) => n !== i),
                      }))
                    }
                  >
                    Retirer cette expérience
                  </button>
                </div>
              ))}
              <button
                type="button"
                disabled={profile.history.length >= 30}
                onClick={() =>
                  setProfile((p) => ({
                    ...p,
                    history: [
                      ...p.history,
                      {
                        role: "",
                        organization: "",
                        start: "",
                        end: "",
                      } as Experience,
                    ],
                  }))
                }
              >
                + Ajouter une expérience
              </button>
            </fieldset>
            <label>
              Années d'expérience confirmées (sans additionner les périodes
              simultanées)
              <input
                type="number"
                min={0}
                max={70}
                step={0.5}
                value={profile.years ?? ""}
                onChange={(e) =>
                  setProfile((p) => ({
                    ...p,
                    years:
                      e.target.value === "" ? null : Number(e.target.value),
                  }))
                }
              />
            </label>
            {(
              [
                ["education", "Formation (une par ligne)"],
                ["projects", "Projets (un par ligne)"],
              ] as const
            ).map(([k, label]) => (
              <label key={k}>
                {label}
                <textarea
                  rows={3}
                  value={profile[k].join("\n")}
                  onChange={(e) =>
                    setProfile((p) => ({
                      ...p,
                      [k]: e.target.value.split("\n"),
                    }))
                  }
                />
              </label>
            ))}
            <fieldset>
              <legend>Langues indiquées dans votre profil</legend>
              {Object.entries({
                fr: "Français",
                en: "Anglais",
                ar: "Arabe",
              }).map(([v, label]) => (
                <label className="check-row" key={v}>
                  <input
                    type="checkbox"
                    checked={profile.languages.includes(v)}
                    onChange={() =>
                      setProfile((p) => ({
                        ...p,
                        languages: p.languages.includes(v)
                          ? p.languages.filter((l) => l !== v)
                          : [...p.languages, v],
                      }))
                    }
                  />
                  {label}
                </label>
              ))}
            </fieldset>
            <h3>Votre prochaine opportunité</h3>
            {(
              [
                ["families", "Métiers recherchés", families],
                [
                  "seniority",
                  "Niveaux recherchés",
                  Object.fromEntries(
                    Object.entries(seniorities).filter(
                      ([v]) => v !== "unknown",
                    ),
                  ),
                ],
                [
                  "cities",
                  "Villes",
                  {
                    casablanca: "Casablanca",
                    rabat: "Rabat",
                    tanger: "Tanger",
                    marrakech: "Marrakech",
                    agadir: "Agadir",
                    fes: "Fès",
                    kenitra: "Kénitra",
                    sale: "Salé",
                    tetouan: "Tétouan",
                    oujda: "Oujda",
                    meknes: "Meknès",
                  },
                ],
                [
                  "workplace",
                  "Mode de travail",
                  {
                    onsite: "Sur site",
                    remote: "À distance",
                    hybrid: "Hybride",
                  },
                ],
                [
                  "internship",
                  "Type d'opportunité",
                  { job: "Emploi", internship: "Stage", pfe: "PFE" },
                ],
              ] as const
            ).map(([name, label, options]) => (
              <fieldset key={name}>
                <legend>{label}</legend>
                <div className="preference-options">
                  {Object.entries(options).map(([value, label]) => (
                    <label key={value} className="check-row">
                      <input
                        type="checkbox"
                        checked={profile.preferences[name].values.includes(
                          value,
                        )}
                        onChange={() => preference(name, value)}
                      />
                      {label}
                    </label>
                  ))}
                </div>
                <label className="check-row preference-mandatory">
                  <input
                    type="checkbox"
                    checked={profile.preferences[name].mandatory}
                    onChange={(e) =>
                      setProfile((p) => ({
                        ...p,
                        preferences: {
                          ...p.preferences,
                          [name]: {
                            ...p.preferences[name],
                            mandatory: e.target.checked,
                          },
                        },
                      }))
                    }
                  />{" "}
                  Critère obligatoire (seules les annonces qui le confirment
                  restent visibles)
                </label>
              </fieldset>
            ))}
            <p>
              Seul ce profil confirmé sera enregistré. Les correspondances sont
              indicatives ; vérifiez les exigences sur le site de l'employeur.
            </p>
            <div className="profile-actions">
              <button className="primary-button" disabled={busy}>
                {busy
                  ? "Chargement…"
                  : "Confirmer et voir toutes mes correspondances"}
              </button>
              {saved && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void perform(() => matches())}
                >
                  Utiliser mon profil déjà enregistré
                </button>
              )}
            </div>
          </form>
        </>
      ) : (
        results && (
          <section className="match-results">
            <div className="profile-toolbar">
              <h2>3. Vos correspondances</h2>
              <button onClick={() => setEditing(true)}>
                Modifier mon profil
              </button>
            </div>
            <div className="profile-toolbar">
              <p>
                <strong>{results.total}</strong> correspondances ·{" "}
                {days ? "30 derniers jours" : "Toutes les dates"}
              </p>
              <button
                disabled={busy}
                onClick={() => void perform(() => matches(1, days ? 0 : 30))}
              >
                {days ? "Voir toutes les dates" : "Voir les 30 derniers jours"}
              </button>
            </div>
            <p>
              Classement selon les métiers, technologies, niveaux et langues. Ce
              n'est pas une probabilité d'embauche. Les exigences non précisées
              restent inconnues.
            </p>
            {!results.total && (
              <p className="notice">
                Aucune correspondance avec ces critères. Élargissez vos
                préférences ou les dates, ou consultez{" "}
                <Link href="/tech">tout le catalogue tech</Link>.
              </p>
            )}
            <div className="job-list">
              {results.matches.map((m) => (
                <div className="match-card" key={m.job.group_key}>
                  <JobCard job={m.job} searchHref="/tech?tech=1" />
                  <div className="match-explanations">
                    {(
                      [
                        ["Pourquoi cette offre", m.reasons],
                        ["À compléter dans votre profil", m.gaps],
                        ["Écarts connus", m.conflicts],
                        ["Informations à vérifier", m.unknowns],
                      ] as const
                    ).map(
                      ([label, items]) =>
                        items.length > 0 && (
                          <div key={label}>
                            <h3>{label}</h3>
                            <ul>
                              {items.map((item) => (
                                <li key={item}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        ),
                    )}
                  </div>
                </div>
              ))}
            </div>
            <nav className="pagination" aria-label="Pages de correspondances">
              <button
                disabled={busy || results.page <= 1}
                onClick={() => void perform(() => matches(results.page - 1))}
              >
                ← Précédent
              </button>
              <span>
                Page {results.page} sur{" "}
                {Math.max(1, Math.ceil(results.total / results.pageSize))}
              </span>
              <button
                disabled={
                  busy || results.page * results.pageSize >= results.total
                }
                onClick={() => void perform(() => matches(results.page + 1))}
              >
                Suivant →
              </button>
            </nav>
          </section>
        )
      )}
      {saved && (
        <section className="profile-panel">
          <h2>Vos données</h2>
          <p>
            Supprimez votre profil et vos préférences à tout moment. Le compteur
            d'utilisation sans contenu du CV est conservé pour appliquer les
            quotas.
          </p>
          <button
            disabled={busy}
            onClick={() => {
              if (
                window.confirm(
                  "Supprimer définitivement votre profil enregistré ?",
                )
              )
                void perform(async () => {
                  await api("/api/profile", { method: "DELETE" });
                  setProfile(emptyProfile());
                  setSaved(false);
                  setResults(null);
                  setEditing(true);
                  setMessage("Votre profil a été supprimé.");
                });
            }}
          >
            Supprimer mon profil
          </button>
        </section>
      )}
    </div>
  );
}
