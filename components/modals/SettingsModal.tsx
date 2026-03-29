"use client"

// components/modals/SettingsModal.tsx
// ─── Fixes en este archivo ────────────────────────────────────────────────────
// BUG #26: Las categorías de tipo "ambos" aparecían en la sección de presupuestos
//          junto a las de tipo "gasto", causando confusión porque una categoría
//          compartida (ej. "Suscripciones") podía ser tanto ingreso como gasto.
//          FIX: En el tab de Presupuestos solo mostramos categorías cuyo tipo
//          es EXCLUSIVAMENTE "gasto". Las de tipo "ambos" quedan excluidas
//          porque no tiene sentido limitar su gasto si también acumula ingresos.
//          Si el usuario quiere presupuesto en una cat. mixta, debe crear una
//          específica de gasto.

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { X, Trash2, Loader2, Plus, Target, PiggyBank, ChevronRight, Shield, Fingerprint, Globe } from "lucide-react"

const LOCALE_KEY = "gastos_locale"
const SUPPORTED_LOCALES = ["es", "en", "ca"] as const
type Locale = typeof SUPPORTED_LOCALES[number]
import { supabase } from "@/lib/supabase"
import { getIcon, CATEGORIA_ICON_OPTIONS } from "@/lib/icons"
import { encryptData, isBiometricAvailable, hasBiometricKey, saveBiometricKey, clearBiometricKey } from "@/lib/crypto"
import type { Categoria, Presupuesto, Objetivo } from "@/types"

type Session = Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"]

export default function SettingsModal({
  isOpen, onClose, categorias, onCategoriesChange,
  presupuestos, onPresupuestosChange,
  objetivos, onObjetivosChange,
  session, userId,
}: {
  isOpen: boolean
  onClose: () => void
  categorias: Categoria[]
  onCategoriesChange: (cats: Categoria[]) => void
  presupuestos: Presupuesto[]
  onPresupuestosChange: (p: Presupuesto[]) => void
  objetivos: Objetivo[]
  onObjetivosChange: (o: Objetivo[]) => void
  session: Session
  userId: string
}) {
  const [newCatName, setNewCatName] = useState("")
  const [newCatTipo, setNewCatTipo] = useState<"gasto" | "ingreso" | "ambos">("gasto")
  const [newCatIcono, setNewCatIcono] = useState("Package")
  const [savingCat, setSavingCat] = useState(false)
  const [deletingCat, setDeletingCat] = useState<string | null>(null)

  const [editingPresupuesto, setEditingPresupuesto] = useState<string | null>(null)
  const [inputPresupuesto, setInputPresupuesto] = useState("")
  const [savingPres, setSavingPres] = useState(false)
  const [deletingPres, setDeletingPres] = useState<string | null>(null)

  const [activeTab, setActiveTab] = useState<"categorias" | "presupuestos" | "objetivos" | "seguridad" | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [inputObjetivo, setInputObjetivo] = useState("")
  const [savingObj, setSavingObj] = useState(false)
  const [editingObj, setEditingObj] = useState(false)
  const [bioAvailable, setBioAvailable] = useState(false)
  const [bioEnabled, setBioEnabled] = useState(false)
  const [bioLoading, setBioLoading] = useState(false)
  const [bioError, setBioError] = useState<string | null>(null)
  const [pendingLocale, setPendingLocale] = useState<Locale | null>(null)
  const t = useTranslations()

  useEffect(() => {
    if (isOpen) {
      setNewCatName("")
      setNewCatIcono("Package")
      setNewCatTipo("gasto")
      setError(null)
      setEditingPresupuesto(null)
      setInputPresupuesto("")
      setInputObjetivo("")
      setEditingObj(false)
      setActiveTab(null)
      setBioError(null)
      isBiometricAvailable().then(available => {
        setBioAvailable(available)
        setBioEnabled(hasBiometricKey())
      })
    }
  }, [isOpen])

  // Cerrar con Escape
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getPresupuesto = (catId: string) =>
    presupuestos.find(p => p.categoria_id === catId)

  // ── CRUD categorías ───────────────────────────────────────────────────────
  const handleAddCat = async () => {
    if (!newCatName.trim()) return
    setSavingCat(true)
    setError(null)

    const { data, error } = await supabase
      .from("categorias")
      .insert({
        user_id: userId,
        label: newCatName.trim(),
        icono: newCatIcono,
        tipo: newCatTipo,
        orden: categorias.length,
      })
      .select()
      .single()

    if (error) setError("Error al crear la categoría.")
    else if (data) {
      onCategoriesChange([...categorias, data])
      setNewCatName("")
      setNewCatIcono("Package")
    }
    setSavingCat(false)
  }

  const handleDeleteCat = async (id: string) => {
    setDeletingCat(id)
    const { error } = await supabase.from("categorias").delete().eq("id", id)
    if (error) setError("No se pudo borrar. Puede que haya movimientos asociados.")
    else onCategoriesChange(categorias.filter(c => c.id !== id))
    setDeletingCat(null)
  }

  // ── CRUD presupuestos ─────────────────────────────────────────────────────
  const handleSavePresupuesto = async (catId: string) => {
    const cantidad = parseFloat(inputPresupuesto)
    if (!cantidad || cantidad <= 0) return
    setSavingPres(true)
    setError(null)

    const cantidadCifrada = await encryptData(cantidad)
    const existing = getPresupuesto(catId)
    if (existing) {
      const { data, error } = await supabase
        .from("presupuestos")
        .update({ cantidad: cantidadCifrada })
        .eq("id", existing.id)
        .select()
        .single()
      if (error) setError("Error al actualizar el presupuesto.")
      else if (data) onPresupuestosChange(presupuestos.map(p => p.id === existing.id ? { ...data, cantidad } : p))
    } else {
      const { data, error } = await supabase
        .from("presupuestos")
        .insert({ user_id: userId, categoria_id: catId, cantidad: cantidadCifrada })
        .select()
        .single()
      if (error) setError("Error al crear el presupuesto.")
      else if (data) onPresupuestosChange([...presupuestos, { ...data, cantidad }])
    }

    setSavingPres(false)
    setEditingPresupuesto(null)
    setInputPresupuesto("")
  }

  const handleDeletePresupuesto = async (presId: string) => {
    setDeletingPres(presId)
    const { error } = await supabase.from("presupuestos").delete().eq("id", presId)
    if (!error) onPresupuestosChange(presupuestos.filter(p => p.id !== presId))
    setDeletingPres(null)
  }

  // BUG #26 FIX: solo categorías de tipo "gasto" para presupuestos.
  // Las de tipo "ambos" se excluyen deliberadamente — un presupuesto de gasto
  // sobre una categoría mixta daría cifras incorrectas al mezclar ingresos.
  // ── CRUD objetivos ────────────────────────────────────────────────────────
  const objetivoAhorro = objetivos.find(o => o.tipo === "ahorro_mensual")

  const handleSaveObjetivo = async () => {
    const cantidad = parseFloat(inputObjetivo)
    if (!cantidad || cantidad <= 0) return
    setSavingObj(true)
    setError(null)
    const cantidadCifrada = await encryptData(cantidad)

    if (objetivoAhorro) {
      const { data, error } = await supabase
        .from("objetivos")
        .update({ cantidad: cantidadCifrada, updated_at: new Date().toISOString() })
        .eq("id", objetivoAhorro.id)
        .select()
        .single()
      if (error) setError("Error al actualizar el objetivo.")
      else if (data) onObjetivosChange(objetivos.map(o => o.id === objetivoAhorro.id ? { ...data, cantidad } : o))
    } else {
      const { data, error } = await supabase
        .from("objetivos")
        .insert({ user_id: userId, tipo: "ahorro_mensual", cantidad: cantidadCifrada })
        .select()
        .single()
      if (error) setError("Error al crear el objetivo.")
      else if (data) onObjetivosChange([...objetivos, { ...data, cantidad }])
    }

    setSavingObj(false)
    setEditingObj(false)
    setInputObjetivo("")
  }

  const handleDeleteObjetivo = async () => {
    if (!objetivoAhorro) return
    const { error } = await supabase.from("objetivos").delete().eq("id", objetivoAhorro.id)
    if (!error) onObjetivosChange(objetivos.filter(o => o.id !== objetivoAhorro.id))
  }

  const handleToggleBiometric = async () => {
    setBioLoading(true)
    setBioError(null)
    if (bioEnabled) {
      clearBiometricKey()
      setBioEnabled(false)
    } else {
      const ok = await saveBiometricKey(userId)
      if (ok) setBioEnabled(true)
      else setBioError("No se pudo activar. Inténtalo de nuevo.")
    }
    setBioLoading(false)
  }



  const currentLocale = ((): Locale => {
    if (typeof window === "undefined") return "es"
    const stored = localStorage.getItem(LOCALE_KEY)
    if (stored && SUPPORTED_LOCALES.includes(stored as Locale)) return stored as Locale
    return "es"
  })()

  // 1. Esta función ahora solo manda al usuario a la "sala de espera"
  const handleChangeLocale = (locale: Locale) => {
    if (locale === currentLocale) return
    // Despedimos a window.confirm y en su lugar abrimos nuestro modal
    setPendingLocale(locale)
  }

  // 2. Esta es la función que ejecuta el cambio real si el usuario dice "Sí"
  const confirmLocaleChange = () => {
    if (!pendingLocale) return
    localStorage.setItem(LOCALE_KEY, pendingLocale)
    window.location.reload()
  }

  const gastoCats = categorias.filter(c => c.tipo === "gasto")

  return (
    <div
      className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-sm flex items-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
    >
      <div className="w-full bg-zinc-900 border-t border-zinc-800/70 rounded-t-3xl p-6 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-8 duration-300">
        <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto mb-4" />

        <div className="flex items-center justify-between mb-5">
          <h2 id="settings-modal-title" className="text-xl font-semibold text-zinc-100">
            {t("settings.title")}
          </h2>
          <button
            onClick={onClose}
            aria-label={t("settings.ariaClose")}
            className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        {/* Lista vertical de secciones */}
        <div className="space-y-2 mb-4">

          {/* ── Selector de idioma ── */}
          <div className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-zinc-800 bg-zinc-800/40">
            <Globe className="w-4 h-4 text-zinc-600 flex-shrink-0" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-300">{t("settings.sectionIdioma")}</p>
              <p className="text-xs text-zinc-600 mt-0.5">{t("settings.sectionIdiomaDesc")}</p>
            </div>
            <div className="flex gap-1">
              {SUPPORTED_LOCALES.map(loc => (
                <button
                  key={loc}
                  onClick={() => handleChangeLocale(loc)}
                  aria-pressed={currentLocale === loc}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${currentLocale === loc
                    ? "bg-emerald-500 text-zinc-950"
                    : "bg-zinc-700 text-zinc-400 hover:bg-zinc-600 hover:text-zinc-200"
                    }`}
                >
                  {loc.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {([
            { id: "categorias", label: t("settings.sectionCategorias"), desc: t("settings.sectionCategoriasDesc"), Icon: ChevronRight },
            { id: "presupuestos", label: t("settings.sectionPresupuestos"), desc: t("settings.sectionPresupuestosDesc"), Icon: ChevronRight },
            { id: "objetivos", label: t("settings.sectionObjetivos"), desc: t("settings.sectionObjetivosDesc"), Icon: ChevronRight },
            { id: "seguridad", label: t("settings.sectionSeguridad"), desc: t("settings.sectionSeguridadDesc"), Icon: Shield },
          ] as const).map(({ id, label, desc, Icon }) => (
            <button
              key={id}
              onClick={() => { setActiveTab(activeTab === id ? null : id); setError(null); setBioError(null) }}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border transition-all text-left ${activeTab === id
                ? "border-emerald-500/40 bg-emerald-950/20"
                : "border-zinc-800 bg-zinc-800/40 hover:border-zinc-700"
                }`}
            >
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${activeTab === id ? "text-zinc-100" : "text-zinc-300"}`}>
                  {label}
                </p>
                <p className="text-xs text-zinc-600 mt-0.5">{desc}</p>
              </div>
              <Icon className={`w-4 h-4 flex-shrink-0 transition-transform ${activeTab === id ? "text-emerald-400 rotate-90" : "text-zinc-600"}`} />
            </button>
          ))}
        </div>

        {error && (
          <div role="alert" className="mb-4 bg-red-950/40 border border-red-900/50 rounded-xl px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* ── Categorías ───────────────────────────────────────────────────── */}
        {activeTab === "categorias" && (
          <div className="space-y-6 mt-2">
            <p className="text-xs text-zinc-600">
              {t.rich("settings.categoriasHint", { tab: chunks => <strong className="text-zinc-500">{chunks}</strong> })}
            </p>
            {(["gasto", "ingreso", "ambos"] as const).map(tipo => {
              const cats = categorias.filter(c => c.tipo === tipo)
              if (cats.length === 0) return null
              return (
                <div key={tipo} className="mb-5">
                  <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">
                    {tipo === "gasto" ? t("settings.catTypeGasto") : tipo === "ingreso" ? t("settings.catTypeIngreso") : t("settings.catTypeAmbos")}
                  </p>
                  <div className="space-y-2">
                    {cats.map(cat => {
                      const CIcon = getIcon(cat.icono)
                      const isDeleting = deletingCat === cat.id
                      return (
                        <div key={cat.id} className="flex items-center justify-between bg-zinc-800 border border-zinc-700/50 rounded-xl px-3 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <CIcon className="w-4 h-4 text-zinc-400 flex-shrink-0" aria-hidden="true" />
                            <span className="text-sm text-zinc-200">{cat.label}</span>
                            {cat.tipo === "ambos" && (
                              <span className="text-[10px] text-zinc-600 bg-zinc-700 px-1.5 py-0.5 rounded">{t("settings.catTagAmbos")}</span>
                            )}
                          </div>
                          <button
                            onClick={() => handleDeleteCat(cat.id)}
                            disabled={!!isDeleting}
                            aria-label={`Borrar categoría ${cat.label}`}
                            className="w-7 h-7 flex items-center justify-center text-zinc-600 hover:text-red-400 transition-colors"
                          >
                            {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
            <div className="space-y-3 pt-4 border-t border-zinc-800">
              <p className="text-xs text-zinc-500 uppercase tracking-widest">{t("settings.catNewSection")}</p>
              <div className="flex rounded-lg bg-zinc-800 p-0.5 border border-zinc-700" role="group" aria-label={t("settings.catAriaTypeGroup")}>
                {(["gasto", "ingreso", "ambos"] as const).map(tipo => (
                  <button
                    key={tipo}
                    onClick={() => setNewCatTipo(tipo)}
                    aria-pressed={newCatTipo === tipo}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${newCatTipo === tipo ? "bg-zinc-600 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"}`}
                  >
                    {tipo === "gasto" ? t("settings.catTypeButtonGasto") : tipo === "ingreso" ? t("settings.catTypeButtonIngreso") : t("settings.catTypeButtonAmbos")}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  placeholder={t("settings.catPlaceholderName")}
                  aria-label={t("settings.catAriaName")}
                  onKeyDown={e => e.key === "Enter" && handleAddCat()}
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 transition-all"
                />
                <button
                  onClick={handleAddCat}
                  disabled={savingCat || !newCatName.trim()}
                  aria-label={t("settings.catAriaCreate")}
                  className="px-3 py-2 bg-emerald-500 text-zinc-950 rounded-xl text-sm font-medium hover:bg-emerald-400 disabled:opacity-50 transition-all"
                >
                  {savingCat ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                </button>
              </div>
              <div>
                <p className="text-xs text-zinc-600 mb-2" id="icono-cat-label">{t("settings.catSectionIcono")}</p>
                <div className="grid grid-cols-7 gap-1.5" role="group" aria-labelledby="icono-cat-label">
                  {CATEGORIA_ICON_OPTIONS.map(name => {
                    const Ico = getIcon(name)
                    return (
                      <button
                        key={name}
                        onClick={() => setNewCatIcono(name)}
                        aria-label={`Icono ${name}`}
                        aria-pressed={newCatIcono === name}
                        className={`aspect-square flex items-center justify-center rounded-lg border transition-all ${newCatIcono === name ? "border-emerald-500/60 bg-emerald-950/30" : "border-zinc-700 bg-zinc-800 hover:border-zinc-500"}`}
                      >
                        <Ico className="w-4 h-4 text-zinc-300" aria-hidden="true" />
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Presupuestos ─────────────────────────────────────────────────── */}
        {activeTab === "presupuestos" && (
          <div className="space-y-3 mt-2">
            <p className="text-xs text-zinc-600 mb-4">
              {t.rich("settings.presupuestosHint", {
                gasto: chunks => <strong className="text-zinc-500">{chunks}</strong>,
                dashboard: chunks => <strong className="text-zinc-500">{chunks}</strong>,
              })}
            </p>
            {gastoCats.length === 0 ? (
              <p className="text-sm text-zinc-600 text-center py-8">{t("settings.presupuestosNoCats")}</p>
            ) : (
              gastoCats.map(cat => {
                const CIcon = getIcon(cat.icono)
                const pres = getPresupuesto(cat.id)
                const isEditing = editingPresupuesto === cat.id
                const isDeleting = deletingPres === pres?.id
                return (
                  <div key={cat.id} className="bg-zinc-800 border border-zinc-700/60 rounded-2xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-zinc-700 flex items-center justify-center flex-shrink-0">
                        <CIcon className="w-4 h-4 text-zinc-300" aria-hidden="true" />
                      </div>
                      <p className="text-sm font-medium text-zinc-200 flex-1">{cat.label}</p>
                      {pres && !isEditing && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-emerald-400 tabular-nums">{Number(pres.cantidad).toFixed(2)}€</span>
                          <button onClick={() => { setEditingPresupuesto(cat.id); setInputPresupuesto(pres.cantidad.toString()) }} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-1 rounded-lg hover:bg-zinc-700">{t("common.edit")}</button>
                          <button onClick={() => handleDeletePresupuesto(pres.id)} disabled={isDeleting} className="text-zinc-600 hover:text-red-400 transition-colors">
                            {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      )}
                      {!pres && !isEditing && (
                        <button onClick={() => { setEditingPresupuesto(cat.id); setInputPresupuesto("") }} className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-emerald-400 transition-colors px-2 py-1 rounded-lg hover:bg-zinc-700">
                          <Target className="w-3.5 h-3.5" aria-hidden="true" /> {t("settings.presupuestosAddLimit")}
                        </button>
                      )}
                    </div>
                    {isEditing && (
                      <div className="flex gap-2 mt-1">
                        <input
                          type="number" inputMode="decimal" value={inputPresupuesto}
                          onChange={e => setInputPresupuesto(e.target.value)}
                          placeholder={t("settings.presupuestosPlaceholder")} autoFocus
                          onKeyDown={e => { if (e.key === "Enter") handleSavePresupuesto(cat.id); if (e.key === "Escape") setEditingPresupuesto(null) }}
                          className="flex-1 bg-zinc-900 border border-zinc-600 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 transition-all"
                        />
                        <button onClick={() => handleSavePresupuesto(cat.id)} disabled={savingPres} className="px-4 py-2 bg-emerald-500 text-zinc-950 rounded-xl text-sm font-semibold hover:bg-emerald-400 disabled:opacity-50 transition-all">
                          {savingPres ? <Loader2 className="w-4 h-4 animate-spin" /> : "OK"}
                        </button>
                        <button onClick={() => setEditingPresupuesto(null)} className="px-3 py-2 text-zinc-500 hover:text-zinc-300 rounded-xl hover:bg-zinc-700 transition-all text-sm">✕</button>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* ── Objetivos ────────────────────────────────────────────────────── */}
        {activeTab === "objetivos" && (
          <div className="space-y-4 mt-2">
            <p className="text-xs text-zinc-600">
              {t.rich("settings.objetivosHint", {
                widget: chunks => <strong className="text-zinc-500">{chunks}</strong>,
              })}
            </p>
            <div className="bg-zinc-800 border border-zinc-700/50 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                  <PiggyBank className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                </div>
                <p className="text-sm font-medium text-zinc-200 flex-1">{t("settings.objetivoAhorroMensual")}</p>
                {objetivoAhorro && !editingObj && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-emerald-400 tabular-nums">{objetivoAhorro.cantidad.toFixed(2)}€</span>
                    <button onClick={() => { setEditingObj(true); setInputObjetivo(objetivoAhorro.cantidad.toString()) }} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-1 rounded-lg hover:bg-zinc-700">{t("common.edit")}</button>
                    <button onClick={handleDeleteObjetivo} aria-label={t("settings.ariaDeleteObjetivo")} className="text-zinc-600 hover:text-red-400 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                {!objetivoAhorro && !editingObj && (
                  <button onClick={() => setEditingObj(true)} className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-emerald-400 transition-colors px-2 py-1 rounded-lg hover:bg-zinc-700">
                    <Target className="w-3.5 h-3.5" aria-hidden="true" /> {t("settings.objetivosAdd")}
                  </button>
                )}
              </div>
              {editingObj && (
                <div className="flex gap-2">
                  <input
                    type="number" inputMode="decimal" value={inputObjetivo}
                    onChange={e => setInputObjetivo(e.target.value)}
                    placeholder={t("settings.objetivosPlaceholder")} autoFocus
                    onKeyDown={e => { if (e.key === "Enter") handleSaveObjetivo(); if (e.key === "Escape") setEditingObj(false) }}
                    className="flex-1 bg-zinc-900 border border-zinc-600 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 transition-all"
                  />
                  <button onClick={handleSaveObjetivo} disabled={savingObj} className="px-4 py-2 bg-emerald-500 text-zinc-950 rounded-xl text-sm font-semibold hover:bg-emerald-400 disabled:opacity-50 transition-all">
                    {savingObj ? <Loader2 className="w-4 h-4 animate-spin" /> : "OK"}
                  </button>
                  <button onClick={() => setEditingObj(false)} className="px-3 py-2 text-zinc-500 hover:text-zinc-300 rounded-xl hover:bg-zinc-700 transition-all text-sm">✕</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Seguridad ────────────────────────────────────────────────────── */}
        {activeTab === "seguridad" && (
          <div className="space-y-4 mt-2">
            <p className="text-xs text-zinc-600">
              {t("settings.seguridadHint")}
            </p>
            {!bioAvailable ? (
              <div className="bg-zinc-800 border border-zinc-700/50 rounded-2xl p-4 flex items-center gap-3">
                <Fingerprint className="w-5 h-5 text-zinc-600 flex-shrink-0" aria-hidden="true" />
                <p className="text-sm text-zinc-500">{t("settings.bioNotSupported")}</p>
              </div>
            ) : (
              <div className="bg-zinc-800 border border-zinc-700/50 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${bioEnabled ? "bg-emerald-500/10" : "bg-zinc-700"}`}>
                    <Fingerprint className={`w-4 h-4 ${bioEnabled ? "text-emerald-400" : "text-zinc-500"}`} aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-200">{t("settings.bioTitle")}</p>
                    <p className="text-xs text-zinc-600 mt-0.5">
                      {bioEnabled ? t("settings.bioActiveDesc") : t("settings.bioInactiveDesc")}
                    </p>
                  </div>
                  <button
                    onClick={handleToggleBiometric}
                    disabled={bioLoading}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${bioEnabled
                      ? "bg-red-500/15 text-red-400 hover:bg-red-500/25"
                      : "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25"
                      } disabled:opacity-50`}
                  >
                    {bioLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : bioEnabled ? t("settings.bioDeactivate") : t("settings.bioActivate")}
                  </button>
                </div>
                {bioError && (
                  <p className="text-xs text-red-400 bg-red-950/30 rounded-xl px-3 py-2">{bioError}</p>
                )}
                {bioEnabled && (
                  <p className="text-xs text-zinc-700">
                    {t("settings.bioReactivateHint")}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full mt-6 py-3 text-sm text-zinc-400 hover:text-zinc-200 border border-zinc-700 rounded-xl transition-all"
        >
          {t("common.close")}
        </button>
        {/* Modal confirmación cambio de idioma */}
        {pendingLocale && (
          <div
            className="absolute inset-0 z-50 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-6 text-center rounded-t-3xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-lang-title"
          >
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-xs shadow-2xl animate-in zoom-in duration-300">
              <h3 id="confirm-lang-title" className="text-zinc-100 font-semibold mb-2">
                {t("settings.langChangeConfirm")}
              </h3>
              <p className="text-zinc-500 text-sm mb-6">
                {t("settings.langChangeWarning")}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setPendingLocale(null)}
                  className="flex-1 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-all"
                >
                  {t("common.cancel")}
                </button>
                <button
                  onClick={confirmLocaleChange}
                  className="flex-1 py-2 text-sm bg-emerald-500 text-zinc-950 rounded-xl font-medium hover:bg-emerald-400 transition-all"
                >
                  {t("common.confirm")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}