'use client'

import React, { useState, useMemo } from 'react'
import { Sparkles, Flame, Calendar, Trophy, Zap } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { toLocalDateStr, getTodayLocalStr } from '@/lib/dateUtils'

/**
 * GitHub-Style Contribution Heatmap for Points Performance
 * Displays daily points earned across the calendar year with interactive tooltips.
 */
export default function PointsHeatmap({ sales = [], year = new Date().getFullYear() }) {
  const [hoveredDay, setHoveredDay] = useState(null)
  const [selectedDay, setSelectedDay] = useState(null)

  // 1. Group sales and sum points by YYYY-MM-DD
  const { dailyPointsMap, totalYearPoints, activeDaysCount, maxPointsInDay, currentStreak } = useMemo(() => {
    const map = {}
    let totalPts = 0

    sales.forEach(sale => {
      if (!sale.sale_date) return
      // Parse the UTC timestamp and convert to LOCAL date string — critical for IST users
      const localDateStr = toLocalDateStr(new Date(sale.sale_date))
      const pts = Number(sale.points_earned || 0)
      const qty = Number(sale.quantity || 1)

      if (!map[localDateStr]) {
        map[localDateStr] = { points: 0, salesCount: 0, units: 0, date: localDateStr }
      }
      map[localDateStr].points += pts
      map[localDateStr].salesCount += 1
      map[localDateStr].units += qty
      totalPts += pts
    })

    const activeDays = Object.keys(map).filter(k => map[k].points > 0).length
    const maxPts = Math.max(0, ...Object.values(map).map(d => d.points))

    // Calculate current streak using LOCAL date keys
    let streak = 0
    const todayStr = getTodayLocalStr()
    for (let i = 0; i < 365; i++) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const k = toLocalDateStr(d)
      if (map[k] && map[k].points > 0) {
        streak++
      } else if (i > 0) {
        break
      }
    }

    return {
      dailyPointsMap: map,
      totalYearPoints: totalPts,
      activeDaysCount: activeDays,
      maxPointsInDay: maxPts,
      currentStreak: streak,
    }
  }, [sales])

  // 2. Generate 52-week calendar grid (Jan 1 to Dec 31 of current year)
  const { calendarWeeks, monthPositions } = useMemo(() => {
    const startOfYear = new Date(year, 0, 1)
    const endOfYear = new Date(year, 11, 31)

    // Find start of first week (Sunday/Monday aligned)
    const firstDayOfWeek = startOfYear.getDay() // 0 = Sun, 1 = Mon ...
    const startDate = new Date(startOfYear)
    startDate.setDate(startDate.getDate() - firstDayOfWeek)

    const weeks = []
    let currentWeek = []
    let curr = new Date(startDate)

    const mPositions = []
    let lastMonth = -1

    while (curr <= endOfYear || currentWeek.length > 0) {
      // Use LOCAL date string — toISOString() would shift by -5:30 for IST, giving wrong day key
      const dateStr = toLocalDateStr(curr)
      const isInYear = curr.getFullYear() === year
      const dayData = dailyPointsMap[dateStr] || { points: 0, salesCount: 0, date: dateStr }

      if (isInYear && curr.getMonth() !== lastMonth && curr.getDate() <= 7) {
        mPositions.push({
          month: curr.toLocaleString('default', { month: 'short' }),
          weekIndex: weeks.length,
        })
        lastMonth = curr.getMonth()
      }

      currentWeek.push({
        date: new Date(curr),
        dateStr,
        points: dayData.points,
        salesCount: dayData.salesCount,
        isInYear,
      })

      if (currentWeek.length === 7) {
        weeks.push(currentWeek)
        currentWeek = []
      }

      curr.setDate(curr.getDate() + 1)
    }

    return { calendarWeeks: weeks, monthPositions: mPositions }
  }, [dailyPointsMap, year])

  // Color intensity mapper — even 1 pt should be clearly visible green
  // Each week column is 12px cell + 3px gap = 15px, used for month label positioning
  const WEEK_PX = 15

  const getCellColor = (pts, isInYear) => {
    if (!isInYear) return "bg-transparent opacity-0 pointer-events-none"
    if (!pts || pts === 0) return "bg-[#ebedf0] hover:bg-zinc-200 border border-zinc-200/80"
    if (pts < 20) return "bg-emerald-400 hover:bg-emerald-500 shadow-2xs"
    if (pts < 50) return "bg-emerald-500 hover:bg-emerald-600 shadow-xs"
    if (pts < 100) return "bg-emerald-600 hover:bg-emerald-700 shadow-xs"
    return "bg-emerald-700 hover:bg-emerald-800 ring-1 ring-emerald-900/30 shadow-xs"
  }

  const activeDisplayDay = hoveredDay || selectedDay

  return (
    <Card className="border-zinc-200 shadow-xs overflow-hidden">
      <CardHeader className="pb-3 border-b border-zinc-100">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-600" />
              Daily Points Activity Heatmap ({year})
            </CardTitle>
            <CardDescription className="text-xs">
              Visual log of daily points earned throughout the year
            </CardDescription>
          </div>

          {/* Quick Metrics Bar — wraps neatly on mobile */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200/60 px-2.5 py-1 rounded-md font-semibold">
              <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
              <span>{totalYearPoints.toLocaleString()} Total Pts</span>
            </div>
            <div className="flex items-center gap-1.5 bg-amber-50 text-amber-800 border border-amber-200/60 px-2.5 py-1 rounded-md font-semibold">
              <Flame className="h-3.5 w-3.5 text-amber-500" />
              <span>{currentStreak} Day Streak</span>
            </div>
            <div className="flex items-center gap-1.5 bg-zinc-100 text-zinc-700 border border-zinc-200/60 px-2.5 py-1 rounded-md font-medium">
              <Trophy className="h-3.5 w-3.5 text-zinc-500" />
              <span>Best: {maxPointsInDay} pts/day</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5">
        <div className="overflow-x-auto pt-4 pb-3 scrollbar-thin">
          <div className="min-w-[760px]">
            {/* Month Labels — positioned above each week column */}
            <div className="relative mb-5" style={{ height: '14px', marginLeft: '32px' }}>
              {monthPositions.map((pos, idx) => (
                <span
                  key={idx}
                  className="absolute text-[10px] font-semibold text-zinc-500"
                  style={{ left: `${pos.weekIndex * WEEK_PX}px` }}
                >
                  {pos.month}
                </span>
              ))}
            </div>

            {/* Grid Container */}
            <div className="flex gap-1.5">
              {/* Day Labels (Mon, Wed, Fri) */}
              <div className="flex flex-col justify-between text-[10px] font-medium text-zinc-400 h-[105px] pr-1 select-none">
                <span>Mon</span>
                <span>Wed</span>
                <span>Fri</span>
              </div>

              {/* 52 Columns */}
              <div className="flex gap-[3px]">
                {calendarWeeks.map((week, wIdx) => (
                  <div key={wIdx} className="flex flex-col gap-[3px]">
                    {week.map((day, dIdx) => {
                      const isHighlighted = (hoveredDay?.dateStr === day.dateStr) || (selectedDay?.dateStr === day.dateStr)
                      return (
                        <div
                          key={dIdx}
                          onMouseEnter={() => setHoveredDay(day)}
                          onMouseLeave={() => setHoveredDay(null)}
                          onClick={() => setSelectedDay(selectedDay?.dateStr === day.dateStr ? null : day)}
                          className={cn(
                            "w-[12px] h-[12px] rounded-[2.5px] transition-all duration-150 cursor-pointer relative",
                            getCellColor(day.points, day.isInYear),
                            isHighlighted && "ring-2 ring-emerald-500 scale-125 z-40"
                          )}
                        >
                          {/* Real Floating Tooltip directly on box when tapped or hovered */}
                          {isHighlighted && day.isInYear && (
                            <div
                              className={cn(
                                "absolute z-50 pointer-events-none whitespace-nowrap select-none",
                                dIdx <= 2 ? "top-full mt-2" : "bottom-full mb-2",
                                wIdx < 5
                                  ? "left-0"
                                  : wIdx > 46
                                  ? "right-0"
                                  : "left-1/2 -translate-x-1/2"
                              )}
                            >
                              {/* Upward Arrow if placed below */}
                              {dIdx <= 2 && (
                                <div
                                  className={cn(
                                    "w-2 h-2 bg-zinc-900 rotate-45 border-l border-t border-zinc-700/60 -mb-1",
                                    wIdx < 5 ? "ml-2.5" : wIdx > 46 ? "ml-auto mr-2.5" : "mx-auto"
                                  )}
                                />
                              )}

                              {/* Tooltip Content Bubble */}
                              <div className="bg-zinc-900 text-white text-[11px] font-medium py-1.5 px-3 rounded-lg shadow-2xl border border-zinc-700/80 flex items-center gap-1.5">
                                {day.points > 0 ? (
                                  <>
                                    <span className="font-bold text-emerald-400 flex items-center gap-1">
                                      <Sparkles className="h-3 w-3 inline text-emerald-400" />
                                      {day.points} {day.points === 1 ? 'pt' : 'pts'}
                                    </span>
                                    <span className="text-zinc-500">•</span>
                                    <span className="text-zinc-200">
                                      {day.date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                                    </span>
                                    {day.salesCount > 0 && (
                                      <span className="text-zinc-400 text-[10px]">
                                        ({day.salesCount} {day.salesCount === 1 ? 'sale' : 'sales'})
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <>
                                    <span className="text-zinc-400 font-semibold">0 pts</span>
                                    <span className="text-zinc-500">•</span>
                                    <span className="text-zinc-300">
                                      {day.date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                                    </span>
                                  </>
                                )}
                              </div>

                              {/* Downward Arrow if placed above */}
                              {dIdx > 2 && (
                                <div
                                  className={cn(
                                    "w-2 h-2 bg-zinc-900 rotate-45 border-r border-b border-zinc-700/60 -mt-1",
                                    wIdx < 5 ? "ml-2.5" : wIdx > 46 ? "ml-auto mr-2.5" : "mx-auto"
                                  )}
                                />
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Legend & Tooltip Footer */}
            <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-3 border-t border-zinc-100 text-[11px] text-zinc-500">
              {/* Dynamic Hover / Tap Info */}
              <div className="min-h-[20px] font-medium">
                {activeDisplayDay && activeDisplayDay.isInYear ? (
                  <span className="text-zinc-900 flex flex-wrap items-center gap-1.5">
                    <span className="font-semibold text-emerald-600">
                      {activeDisplayDay.points} {activeDisplayDay.points === 1 ? 'point' : 'points'}
                    </span>
                    <span>earned on {activeDisplayDay.date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    {activeDisplayDay.salesCount > 0 && (
                      <span className="text-zinc-400">({activeDisplayDay.salesCount} {activeDisplayDay.salesCount === 1 ? 'sale' : 'sales'})</span>
                    )}
                  </span>
                ) : (
                  <span>Hover or tap any square to view points earned on that date</span>
                )}
              </div>

              {/* Intensity Scale Legend */}
              <div className="flex items-center gap-1 text-[10px] text-zinc-400 font-medium">
                <span>Less</span>
                <span className="w-2.5 h-2.5 rounded-[2px] bg-[#ebedf0] border border-zinc-200/80 inline-block" />
                <span className="w-2.5 h-2.5 rounded-[2px] bg-emerald-400 border border-emerald-500 inline-block" />
                <span className="w-2.5 h-2.5 rounded-[2px] bg-emerald-500 border border-emerald-600 inline-block" />
                <span className="w-2.5 h-2.5 rounded-[2px] bg-emerald-600 border border-emerald-700 inline-block" />
                <span className="w-2.5 h-2.5 rounded-[2px] bg-emerald-700 border border-emerald-800 inline-block" />
                <span>More</span>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Swipe Guidance Hint */}
        <div className="flex items-center justify-between text-[10px] text-zinc-400 mt-2 pt-2 border-t border-zinc-50 sm:hidden">
          <span>← Swipe horizontally to browse full year</span>
          <span>52 Weeks ({year})</span>
        </div>
      </CardContent>
    </Card>
  )
}
