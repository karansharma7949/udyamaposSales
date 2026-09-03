import { createClient } from '@supabase/supabase-js'
import pptxgen from 'pptxgenjs'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function capitalizeName(name) {
  if (!name) return 'Champion'
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const dateParam = searchParams.get('date') // Optional YYYY-MM-DD

    // 1. Determine local date boundaries (IST-safe)
    const now = new Date()
    let targetDate = now
    if (dateParam) {
      const parts = dateParam.split('-')
      if (parts.length === 3) {
        targetDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
      }
    }

    const year = targetDate.getFullYear()
    const month = targetDate.getMonth() + 1
    const day = targetDate.getDate()

    const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0).toISOString()
    const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999).toISOString()

    const formattedDateStr = targetDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    const dateFileName = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

    // 2. Fetch sales for today
    const { data: sales, error: salesError } = await supabaseAdmin
      .from('sales')
      .select('employee_id, points_earned, quantity, sale_date')
      .gte('sale_date', startOfDay)
      .lte('sale_date', endOfDay)

    if (salesError) throw salesError

    // 3. Aggregate points & units per employee for today
    const performerMap = new Map()
    let companyTodayPoints = 0
    let companyTodayUnits = 0

    ;(sales || []).forEach(s => {
      const pts = Number(s.points_earned || 0)
      const qty = Number(s.quantity || 0)
      companyTodayPoints += pts
      companyTodayUnits += qty

      const existing = performerMap.get(s.employee_id) || { points: 0, units: 0, salesCount: 0 }
      existing.points += pts
      existing.units += qty
      existing.salesCount += 1
      performerMap.set(s.employee_id, existing)
    })

    const performerIds = Array.from(performerMap.keys())

    // 4. Fetch profiles for these performers
    let profiles = []
    if (performerIds.length > 0) {
      const { data: profs, error: profError } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, employee_code, avatar_url, email')
        .in('id', performerIds)

      if (profError) throw profError
      profiles = profs || []
    }

    // 5. Fetch monthly targets for current month
    let targets = []
    if (performerIds.length > 0) {
      const { data: tgts } = await supabaseAdmin
        .from('monthly_targets')
        .select('employee_id, target_points')
        .eq('month', month)
        .eq('year', year)
        .in('employee_id', performerIds)

      targets = tgts || []
    }

    // 6. Fetch month-to-date points for each performer
    const startOfMonth = new Date(year, month - 1, 1, 0, 0, 0, 0).toISOString()
    let monthPointsMap = new Map()
    if (performerIds.length > 0) {
      const { data: monthSales } = await supabaseAdmin
        .from('sales')
        .select('employee_id, points_earned')
        .gte('sale_date', startOfMonth)
        .lte('sale_date', endOfDay)
        .in('employee_id', performerIds)

      ;(monthSales || []).forEach(s => {
        const cur = monthPointsMap.get(s.employee_id) || 0
        monthPointsMap.set(s.employee_id, cur + Number(s.points_earned || 0))
      })
    }

    // Combine performer details & sort highest points first
    const performers = performerIds.map(empId => {
      const agg = performerMap.get(empId)
      const prof = profiles.find(p => p.id === empId) || {}
      const tgt = targets.find(t => t.employee_id === empId)
      const targetPts = Number(tgt?.target_points || 0)
      const monthPts = monthPointsMap.get(empId) || agg.points
      const progressPct = targetPts > 0 ? Math.round((monthPts / targetPts) * 100) : 0

      return {
        id: empId,
        full_name: prof.full_name || 'Champion',
        display_name: capitalizeName(prof.full_name),
        employee_code: prof.employee_code || '—',
        avatar_url: prof.avatar_url || null,
        today_points: agg.points,
        today_units: agg.units,
        month_points: monthPts,
        target_points: targetPts,
        progress_pct: progressPct,
      }
    })

    performers.sort((a, b) => b.today_points - a.today_points)

    // =========================================================================
    // 7. Initialize PowerPoint Presentation
    // Standard 16:9 Widescreen: Width = 10.0 inches, Height = 5.625 inches
    // =========================================================================
    const pptx = new pptxgen()
    pptx.layout = 'LAYOUT_16x9'
    pptx.author = 'UdyamaPOS Sales Tracker'
    pptx.title = `Today's Sales Champions — ${formattedDateStr}`
    pptx.subject = 'Daily Sales Performance Standup Recognition'

    // Color Palette
    const BG_DARK = '090D16'       // Deep Obsidian background
    const PANEL_DARK = '131C2E'    // Card fill
    const PANEL_BORDER = '23324D'  // Card stroke
    const GOLD = 'F59E0B'          // Gold accents
    const GOLD_LIGHT = 'FEF3C7'
    const EMERALD = '10B981'       // Emerald Green
    const CYAN = '38BDF8'          // Cyan
    const INDIGO = '818CF8'        // Soft Indigo
    const WHITE = 'FFFFFF'
    const GRAY_LIGHT = 'E2E8F0'
    const GRAY_MUTED = '94A3B8'
    const GRAY_DARK = '64748B'

    // =========================================================================
    // SLIDE 1: COVER / TITLE SLIDE (Fits exactly within 10.0" x 5.625")
    // =========================================================================
    const coverSlide = pptx.addSlide()
    coverSlide.background = { color: BG_DARK }

    // Top Accent Stripe
    coverSlide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: 10.0, h: 0.08,
      fill: { color: GOLD },
    })

    // Header Tag
    coverSlide.addText('UDYAMAPOS • DAILY SALES EXCELLENCE', {
      x: 0.6, y: 0.45, w: 8.8, h: 0.3,
      fontSize: 11, bold: true, color: GOLD,
      charSpacing: 2, fontFace: 'Calibri',
    })

    // Hero Title
    coverSlide.addText("Today's Sales Champions", {
      x: 0.6, y: 0.8, w: 8.8, h: 0.75,
      fontSize: 34, bold: true, color: WHITE,
      fontFace: 'Calibri',
    })

    // Subtitle & Date
    coverSlide.addText(
      `Honoring outstanding daily performance, customer wins, and leaderboard points\n${formattedDateStr}`,
      {
        x: 0.6, y: 1.55, w: 8.8, h: 0.55,
        fontSize: 12, color: GRAY_MUTED,
        fontFace: 'Calibri', lineSpacing: 18,
      }
    )

    // 3 Balanced Stat Cards (x: 0.6 to 9.4 -> perfectly fits within 10.0)
    // Card width = 2.7, Gap = 0.35 -> 0.6 + 2.7 + 0.35 + 2.7 + 0.35 + 2.7 = 9.4
    const coverCards = [
      {
        label: 'POINTS SCORED TODAY',
        val: `${companyTodayPoints.toLocaleString()} pts`,
        color: EMERALD,
        sub: 'Accumulated across all sales today',
      },
      {
        label: 'UNITS CLOSED TODAY',
        val: `${companyTodayUnits.toLocaleString()} units`,
        color: INDIGO,
        sub: 'Total products delivered to customers',
      },
      {
        label: 'ACTIVE CHAMPIONS',
        val: `${performers.length} ${performers.length === 1 ? 'Performer' : 'Performers'}`,
        color: GOLD,
        sub: 'Ranked on today’s leaderboard',
      },
    ]

    const cardY = 2.25
    const cardH = 2.3
    coverCards.forEach((c, idx) => {
      const cx = 0.6 + idx * (2.7 + 0.35)
      coverSlide.addShape(pptx.ShapeType.roundRect, {
        x: cx, y: cardY, w: 2.7, h: cardH, rectRadius: 0.15,
        fill: { color: PANEL_DARK },
        line: { color: PANEL_BORDER, width: 1.2 },
      })
      coverSlide.addText(c.label, {
        x: cx + 0.2, y: cardY + 0.25, w: 2.3, h: 0.25,
        fontSize: 9.5, bold: true, color: GRAY_MUTED, charSpacing: 1.2,
      })
      coverSlide.addText(c.val, {
        x: cx + 0.2, y: cardY + 0.65, w: 2.3, h: 0.7,
        fontSize: 28, bold: true, color: c.color, fontFace: 'Calibri',
      })
      coverSlide.addText(c.sub, {
        x: cx + 0.2, y: cardY + 1.5, w: 2.3, h: 0.5,
        fontSize: 10, color: GRAY_DARK, fontFace: 'Calibri',
      })
    })

    // Footer
    coverSlide.addText('OFFICE HALL STANDUP RECOGNITION • BIG SCREEN PRESENTATION', {
      x: 0.6, y: 4.95, w: 8.8, h: 0.3,
      fontSize: 9, bold: true, color: GRAY_DARK, align: 'center', charSpacing: 2,
    })

    // =========================================================================
    // SLIDES 2 to N: INDIVIDUAL PERFORMER SHOWCASE
    // =========================================================================
    if (performers.length === 0) {
      // Empty State: Motivational kickoff slide
      const zeroSlide = pptx.addSlide()
      zeroSlide.background = { color: BG_DARK }

      zeroSlide.addShape(pptx.ShapeType.roundRect, {
        x: 1.5, y: 1.2, w: 7.0, h: 3.2, rectRadius: 0.2,
        fill: { color: PANEL_DARK },
        line: { color: PANEL_BORDER, width: 1.5 },
      })

      zeroSlide.addText('READY TO MAKE TODAY COUNT!', {
        x: 1.8, y: 1.6, w: 6.4, h: 0.35,
        fontSize: 12, bold: true, color: GOLD, align: 'center', charSpacing: 2,
      })

      zeroSlide.addText('No Sales Logged Yet Today', {
        x: 1.8, y: 2.1, w: 6.4, h: 0.65,
        fontSize: 26, bold: true, color: WHITE, align: 'center',
      })

      zeroSlide.addText(
        'Log your sales on UdyamaPOS to claim your spot on the big screen daily leaderboard!',
        {
          x: 1.8, y: 2.85, w: 6.4, h: 0.6,
          fontSize: 12, color: GRAY_MUTED, align: 'center', lineSpacing: 18,
        }
      )
    } else {
      performers.forEach((performer, index) => {
        const rank = index + 1
        const slide = pptx.addSlide()
        slide.background = { color: BG_DARK }

        // Top Accent Stripe
        const stripeColor = rank === 1 ? GOLD : (rank === 2 ? 'CBD5E1' : (rank === 3 ? 'D97706' : INDIGO))
        slide.addShape(pptx.ShapeType.rect, {
          x: 0, y: 0, w: 10.0, h: 0.08,
          fill: { color: stripeColor },
        })

        // Top Row: Rank Ribbon on left, Date on right
        let rankLabel = `⭐ STAR PERFORMER TODAY`
        let rankBadgeBg = '1E293B'
        let rankBadgeText = GOLD
        if (rank === 1) {
          rankLabel = `👑 #1 TOP PERFORMER TODAY`
          rankBadgeBg = '78350F'
          rankBadgeText = GOLD_LIGHT
        } else if (rank === 2) {
          rankLabel = `🥈 #2 PERFORMER OF THE DAY`
          rankBadgeBg = '334155'
          rankBadgeText = 'F1F5F9'
        } else if (rank === 3) {
          rankLabel = `🥉 #3 PERFORMER OF THE DAY`
          rankBadgeBg = '451A03'
          rankBadgeText = 'FDE68A'
        }

        slide.addShape(pptx.ShapeType.roundRect, {
          x: 0.6, y: 0.32, w: 3.0, h: 0.35, rectRadius: 0.1,
          fill: { color: rankBadgeBg },
          line: { color: stripeColor, width: 1.2 },
        })
        slide.addText(rankLabel, {
          x: 0.6, y: 0.32, w: 3.0, h: 0.35,
          fontSize: 10, bold: true, color: rankBadgeText, align: 'center', charSpacing: 1.2,
        })

        slide.addText(`DAILY STANDUP • ${formattedDateStr.toUpperCase()}`, {
          x: 3.8, y: 0.35, w: 5.6, h: 0.3,
          fontSize: 10, bold: true, color: GRAY_DARK, align: 'right', charSpacing: 1.5,
        })

        // Giant Celebratory Headline
        slide.addText(`🎉 Congratulations, ${performer.display_name}!`, {
          x: 0.6, y: 0.8, w: 8.8, h: 0.55,
          fontSize: 26, bold: true, color: WHITE, fontFace: 'Calibri',
        })

        slide.addText(
          `Outstanding sales drive today! Scored ${performer.today_points} points and closed ${performer.today_units} units for the team.`,
          {
            x: 0.6, y: 1.35, w: 8.8, h: 0.35,
            fontSize: 12, color: GRAY_MUTED, fontFace: 'Calibri',
          }
        )

        // ---------------------------------------------------------------------
        // LEFT CARD: Performer Avatar & Identification Box
        // x: 0.6, y: 1.85, w: 2.6, h: 2.95 (Fits within 5.625)
        // ---------------------------------------------------------------------
        slide.addShape(pptx.ShapeType.roundRect, {
          x: 0.6, y: 1.85, w: 2.6, h: 2.95, rectRadius: 0.15,
          fill: { color: PANEL_DARK },
          line: { color: PANEL_BORDER, width: 1.2 },
        })

        // Avatar: 1.8" x 1.8", centered in 2.6" box: 0.6 + (2.6 - 1.8)/2 = 1.0
        const avatarSize = 1.8
        const avatarX = 1.0
        const avatarY = 2.05

        if (performer.avatar_url && performer.avatar_url.startsWith('http')) {
          try {
            slide.addImage({
              path: performer.avatar_url,
              x: avatarX, y: avatarY, w: avatarSize, h: avatarSize,
              round: true,
            })
          } catch (e) {
            console.warn('Image embed fallback:', e)
          }
        } else {
          // Circular Initials Avatar
          slide.addShape(pptx.ShapeType.ellipse, {
            x: avatarX, y: avatarY, w: avatarSize, h: avatarSize,
            fill: { color: '1E293B' },
            line: { color: stripeColor, width: 2.5 },
          })
          slide.addText(performer.display_name?.charAt(0) || 'E', {
            x: avatarX, y: avatarY, w: avatarSize, h: avatarSize,
            fontSize: 44, bold: true, color: WHITE, align: 'center', valign: 'middle',
          })
        }

        // Employee Name
        slide.addText(performer.display_name, {
          x: 0.7, y: 3.95, w: 2.4, h: 0.4,
          fontSize: 18, bold: true, color: WHITE, align: 'center', fontFace: 'Calibri',
        })

        // Employee Code
        slide.addText(`CODE: ${performer.employee_code}`, {
          x: 0.7, y: 4.35, w: 2.4, h: 0.3,
          fontSize: 10, bold: true, color: INDIGO, align: 'center', charSpacing: 1.2,
        })

        // ---------------------------------------------------------------------
        // RIGHT AREA: Performance Metrics & Commendation
        // x: 3.45 to 9.4 (Total width 5.95)
        // ---------------------------------------------------------------------
        // 3 Metric Cards side by side: Width 1.85, Gap 0.2 -> 3.45 + 1.85 + 0.2 + 1.85 + 0.2 + 1.85 = 9.4
        // Card 1: Today's Points
        slide.addShape(pptx.ShapeType.roundRect, {
          x: 3.45, y: 1.85, w: 1.85, h: 1.4, rectRadius: 0.15,
          fill: { color: PANEL_DARK },
          line: { color: EMERALD, width: 1.8 },
        })
        slide.addText("TODAY'S POINTS", {
          x: 3.55, y: 2.0, w: 1.65, h: 0.25,
          fontSize: 9, bold: true, color: GRAY_MUTED, charSpacing: 1.2,
        })
        slide.addText(`+${performer.today_points.toLocaleString()} PTS`, {
          x: 3.55, y: 2.25, w: 1.65, h: 0.55,
          fontSize: 22, bold: true, color: EMERALD, fontFace: 'Calibri',
        })
        slide.addText('Earned Today', {
          x: 3.55, y: 2.8, w: 1.65, h: 0.3,
          fontSize: 9.5, color: GRAY_DARK,
        })

        // Card 2: Units Closed
        slide.addShape(pptx.ShapeType.roundRect, {
          x: 5.5, y: 1.85, w: 1.85, h: 1.4, rectRadius: 0.15,
          fill: { color: PANEL_DARK },
          line: { color: PANEL_BORDER, width: 1.2 },
        })
        slide.addText('UNITS CLOSED', {
          x: 5.6, y: 2.0, w: 1.65, h: 0.25,
          fontSize: 9, bold: true, color: GRAY_MUTED, charSpacing: 1.2,
        })
        slide.addText(`${performer.today_units} Units`, {
          x: 5.6, y: 2.25, w: 1.65, h: 0.55,
          fontSize: 20, bold: true, color: CYAN, fontFace: 'Calibri',
        })
        slide.addText('Closed Today', {
          x: 5.6, y: 2.8, w: 1.65, h: 0.3,
          fontSize: 9.5, color: GRAY_DARK,
        })

        // Card 3: Monthly Goal
        slide.addShape(pptx.ShapeType.roundRect, {
          x: 7.55, y: 1.85, w: 1.85, h: 1.4, rectRadius: 0.15,
          fill: { color: PANEL_DARK },
          line: { color: PANEL_BORDER, width: 1.2 },
        })
        slide.addText('MONTHLY GOAL', {
          x: 7.65, y: 2.0, w: 1.65, h: 0.25,
          fontSize: 9, bold: true, color: GRAY_MUTED, charSpacing: 1.2,
        })
        slide.addText(
          performer.target_points > 0 ? `${performer.progress_pct}%` : 'Goal Active',
          {
            x: 7.65, y: 2.25, w: 1.65, h: 0.55,
            fontSize: 20, bold: true, color: GOLD, fontFace: 'Calibri',
          }
        )
        slide.addText(
          performer.target_points > 0
            ? `${performer.month_points} / ${performer.target_points} pts`
            : `${performer.month_points} pts month-to-date`,
          {
            x: 7.65, y: 2.8, w: 1.65, h: 0.3,
            fontSize: 9.5, color: GRAY_DARK,
          }
        )

        // Commendation Banner
        slide.addShape(pptx.ShapeType.roundRect, {
          x: 3.45, y: 3.45, w: 5.95, h: 1.35, rectRadius: 0.15,
          fill: { color: '141E33' },
          line: { color: stripeColor, width: 1.2 },
        })
        slide.addText('OFFICE RECOGNITION COMMENDATION', {
          x: 3.65, y: 3.6, w: 5.55, h: 0.25,
          fontSize: 9.5, bold: true, color: GOLD, charSpacing: 1.5,
        })
        slide.addText(
          `“Congratulations to ${performer.display_name} for leading the charge today with extraordinary determination and sales excellence. Thank you for raising the bar for our entire team!”`,
          {
            x: 3.65, y: 3.85, w: 5.55, h: 0.8,
            fontSize: 11, italic: true, color: GRAY_LIGHT, fontFace: 'Calibri', lineSpacing: 16,
          }
        )

        // Footer
        slide.addText('UDYAMAPOS SALES STANDUP • BIG SCREEN RECOGNITION', {
          x: 0.6, y: 5.0, w: 8.8, h: 0.25,
          fontSize: 8.5, bold: true, color: GRAY_DARK, align: 'center', charSpacing: 2,
        })
      })
    }

    // =========================================================================
    // FINAL SLIDE: TEAM MOTIVATION & CLOSING
    // =========================================================================
    const rallySlide = pptx.addSlide()
    rallySlide.background = { color: BG_DARK }

    rallySlide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: 10.0, h: 0.08,
      fill: { color: EMERALD },
    })

    rallySlide.addText('GREAT HUSTLE TODAY, TEAM!', {
      x: 0.6, y: 1.2, w: 8.8, h: 0.4,
      fontSize: 14, bold: true, color: GOLD, align: 'center', charSpacing: 3,
    })

    rallySlide.addText("Let's Keep The Momentum Going Tomorrow!", {
      x: 0.6, y: 1.7, w: 8.8, h: 0.85,
      fontSize: 32, bold: true, color: WHITE, align: 'center', fontFace: 'Calibri',
    })

    // Center Message Panel
    rallySlide.addShape(pptx.ShapeType.roundRect, {
      x: 1.5, y: 2.7, w: 7.0, h: 1.6, rectRadius: 0.15,
      fill: { color: PANEL_DARK },
      line: { color: PANEL_BORDER, width: 1.2 },
    })
    rallySlide.addText(
      'Every conversation, follow-up call, and closed deal brings us closer to our monthly company targets.\nRest up, recharge, and let\'s crush tomorrow\'s leaderboard!',
      {
        x: 1.8, y: 2.95, w: 6.4, h: 1.1,
        fontSize: 13, color: GRAY_LIGHT, align: 'center', fontFace: 'Calibri', lineSpacing: 20,
      }
    )

    rallySlide.addText('UDYAMAPOS • EMPOWERING SALES EXCELLENCE', {
      x: 0.6, y: 4.9, w: 8.8, h: 0.3,
      fontSize: 9.5, bold: true, color: GRAY_DARK, align: 'center', charSpacing: 2.5,
    })

    // 8. Stream presentation buffer
    const buffer = await pptx.write({ outputType: 'nodebuffer' })

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="UdyamaPOS_Daily_Champions_${dateFileName}.pptx"`,
        'Content-Length': buffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('Server error generating PPTX slides:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
