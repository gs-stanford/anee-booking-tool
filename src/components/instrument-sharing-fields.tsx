export function InstrumentSharingFields({ impactCategory = "GENERAL", crossShared = false }: { impactCategory?: string; crossShared?: boolean }) {
  return <fieldset className="sharing-fields">
    <legend>Homepage calendar visibility</legend>
    <div className="field">
      <label htmlFor="impactCategory">Instrument category</label>
      <select name="impactCategory" id="impactCategory" defaultValue={impactCategory}>
        <option value="GENERAL">General instrument</option>
        <option value="LASER">Laser</option>
        <option value="CNT_REACTOR">CNT reactor</option>
        <option value="FUMEHOOD">Fumehood</option>
      </select>
      <small>Lasers, CNT reactors and fumehoods automatically appear on the homepage calendar.</small>
    </div>
    <label className="toggle-row"><input type="checkbox" name="crossShared" defaultChecked={crossShared} /><span>Cross-shared<small>Show this instrument’s bookings on the homepage, regardless of category.</small></span></label>
  </fieldset>;
}
