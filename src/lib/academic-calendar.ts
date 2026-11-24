// Informational overlays only: never used by reservation conflict/availability checks.
// Dates verified 2026-11-23. Future schedules remain subject to Stanford revisions.
const HOLIDAYS = "https://cardinalatwork.stanford.edu/benefits-rewards/time-leaves/university-holiday-schedule";
const ACADEMIC = "https://studentservices.stanford.edu/calendar-events/academic-calendars/stanford-academic-calendar-2026-2027";
const PROJECTION = "https://drive.google.com/file/d/1WEJDxXgxD8NjmKoqg9olvdsTFLCcFwk_/view";
export type AcademicCalendarEntry = {
  title:string; start:string; end:string; source:string; note:string; projected?:boolean;
};
const holiday=(title:string,date:string):AcademicCalendarEntry=>({title,start:date,end:date,source:HOLIDAYS,note:"University holiday. Stanford's published holiday dates are subject to change."});
export const ACADEMIC_CALENDAR:AcademicCalendarEntry[] = [
  holiday("New Year's Day","2026-01-01"),
  holiday("Martin Luther King Jr. Day","2026-01-19"),
  holiday("Presidents' Day","2026-02-16"),
  holiday("Memorial Day","2026-05-25"),
  holiday("Independence Day (observed)","2026-07-03"),
  holiday("Labor Day","2026-09-07"),
  holiday("Thanksgiving","2026-11-26"),
  holiday("Day after Thanksgiving","2026-11-27"),
  holiday("Winter holiday","2026-12-24"),
  holiday("Winter holiday","2026-12-25"),
  holiday("New Year's Day","2027-01-01"),
  holiday("Martin Luther King Jr. Day","2027-01-18"),
  holiday("Presidents' Day","2027-02-15"),
  holiday("Memorial Day","2027-05-31"),
  holiday("Independence Day (observed)","2027-07-05"),
  holiday("Labor Day","2027-09-06"),
  holiday("Thanksgiving","2027-11-25"),
  holiday("Day after Thanksgiving","2027-11-26"),
  holiday("Winter holiday","2027-12-23"),
  holiday("Winter holiday","2027-12-24"),
  {title:"Democracy Day",start:"2026-11-03",end:"2026-11-03",source:ACADEMIC,note:"Academic calendar: day of civic service; no classes."},
  {title:"Thanksgiving recess",start:"2026-11-23",end:"2026-11-27",source:ACADEMIC,note:"Academic recess; no classes."},
  {title:"Winter break",start:"2026-12-12",end:"2027-01-03",source:ACADEMIC,note:"Academic break between Autumn examinations and Winter instruction. This is not the staff closure schedule."},
  {title:"University winter closure",start:"2026-12-21",end:"2027-01-01",source:HOLIDAYS,note:"Published university winter closure. Lab reservation availability is managed separately."},
  {title:"Spring break",start:"2027-03-22",end:"2027-03-26",source:PROJECTION,note:"Registrar's published spring-break week, between Winter examinations and Spring instruction."},
  {title:"Thanksgiving recess",start:"2027-11-22",end:"2027-11-26",source:PROJECTION,note:"Registrar's projected academic recess; subject to change.",projected:true},
  {title:"Winter break",start:"2027-12-11",end:"2028-01-02",source:PROJECTION,note:"Inferred between the projected Autumn exam end and Winter class start. The 2027–28 university staff closure has not been announced.",projected:true},
  {title:"Spring break",start:"2028-03-20",end:"2028-03-24",source:PROJECTION,note:"Registrar's projected spring-break week; subject to change.",projected:true},
  {title:"Thanksgiving recess",start:"2028-11-20",end:"2028-11-24",source:PROJECTION,note:"Registrar's projected academic recess; subject to change.",projected:true},
  {title:"Winter break",start:"2028-12-16",end:"2029-01-07",source:PROJECTION,note:"Inferred between the projected Autumn exam end and Winter class start; not a staff closure announcement.",projected:true}
];
// Inclusive date keys avoid timezone/DST shifts and let multi-day labels cross weeks.
export function academicCalendarForDate(date:string) {
  return ACADEMIC_CALENDAR.filter(entry=>date>=entry.start && date<=entry.end);
}
