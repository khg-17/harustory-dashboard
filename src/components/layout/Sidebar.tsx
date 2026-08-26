import React, { useState, useEffect } from "react";
import { Menu, Users, DollarSign, BarChart2, Award, ShoppingBag, Filter, BookOpen, UserPlus, Layers, ChevronDown, ChevronRight, Gift, Calendar } from "lucide-react";
import { ActiveTab, RevenueCategoryTab, FunnelCategoryTab, MissionSubTab } from "@/types/dashboard";

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  revenueCategoryTab: RevenueCategoryTab;
  setRevenueCategoryTab: (tab: RevenueCategoryTab) => void;
  funnelCategoryTab?: FunnelCategoryTab;
  setFunnelCategoryTab?: (tab: FunnelCategoryTab) => void;
  missionSubTab?: MissionSubTab;
  setMissionSubTab?: (subTab: MissionSubTab) => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  revenueCategoryTab,
  setRevenueCategoryTab,
  funnelCategoryTab = "detail",
  setFunnelCategoryTab,
  missionSubTab = "general",
  setMissionSubTab,
  isSidebarCollapsed,
  setIsSidebarCollapsed
}) => {
  const [isFunnelOpen, setIsFunnelOpen] = useState<boolean>(activeTab === "funnel");
  const [isRevenueOpen, setIsRevenueOpen] = useState<boolean>(activeTab === "revenue");
  const [isMissionOpen, setIsMissionOpen] = useState<boolean>(activeTab === "mission");

  useEffect(() => {
    setIsFunnelOpen(activeTab === "funnel");
    setIsRevenueOpen(activeTab === "revenue");
    setIsMissionOpen(activeTab === "mission");
  }, [activeTab]);

  return (
    <aside className={`${isSidebarCollapsed ? "w-16 p-3" : "w-60 p-4"} bg-white flex flex-col shrink-0 border-r border-[#e5e8eb]/60 space-y-6 transition-all duration-200 select-none min-h-screen`}>
      {/* Top Header: Original GURU COMPANY Logo & Collapsible Menu Toggle */}
      <div className={`flex items-center ${isSidebarCollapsed ? "justify-center" : "justify-between"} pb-4 border-b border-[#e5e8eb]/60`}>
        {!isSidebarCollapsed && (
          <div className="flex flex-col items-start cursor-pointer select-none">
            <span 
              className="text-xl font-bold text-[#000000] uppercase leading-none font-sans"
              style={{ letterSpacing: "0.22em" }}
            >
              GURU
            </span>
            <span 
              className="text-[9px] font-semibold text-[#000000] uppercase mt-1.5 pl-0.5"
              style={{ letterSpacing: "0.42em" }}
            >
              COMPANY
            </span>
          </div>
        )}

        <button 
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="text-[#8b95a1] hover:text-[#191f28] cursor-pointer p-1.5 rounded-lg hover:bg-[#f2f4f6] transition-colors"
          title={isSidebarCollapsed ? "사이드바 펼치기" : "사이드바 접기"}
        >
          <Menu className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation Sidebar Tabs */}
      <div className="space-y-1">
        {/* 1. 유저 현황 */}
        <button 
          onClick={() => setActiveTab("users")}
          className={`flex items-center ${isSidebarCollapsed ? "justify-center" : "gap-2.5"} w-full px-3 py-2.5 text-[13px] font-semibold rounded-lg transition-all cursor-pointer ${
            activeTab === "users"
              ? "bg-[#e5e7eb] text-[#191f28] font-bold"
              : "text-[#4e5968] hover:text-[#191f28] hover:bg-[#f2f4f6]"
          }`}
          title="유저 현황"
        >
          <Users className={`w-4 h-4 shrink-0 ${activeTab === "users" ? "text-[#191f28]" : "text-[#8b95a1]"}`} />
          {!isSidebarCollapsed && <span>유저 현황</span>}
        </button>



        {/* 3. 미션 현황 (메인 그룹) */}
        <div className="space-y-0.5">
          <button 
            onClick={() => {
              if (activeTab !== "mission") {
                setActiveTab("mission");
                setIsMissionOpen(true);
              } else {
                setIsMissionOpen(!isMissionOpen);
              }
            }}
            className={`flex items-center ${isSidebarCollapsed ? "justify-center" : "justify-between"} w-full px-3 py-2.5 text-[13px] font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === "mission"
                ? "bg-[#e5e7eb] text-[#191f28] font-bold"
                : "text-[#4e5968] hover:text-[#191f28] hover:bg-[#f2f4f6]"
            }`}
            title="미션 현황"
          >
            <div className="flex items-center gap-2.5">
              <Gift className={`w-4 h-4 shrink-0 ${activeTab === "mission" ? "text-[#191f28]" : "text-[#8b95a1]"}`} />
              {!isSidebarCollapsed && <span>미션 현황</span>}
            </div>
            {!isSidebarCollapsed && (
              isMissionOpen ? (
                <ChevronDown className="w-4 h-4 text-[#8b95a1]" />
              ) : (
                <ChevronRight className="w-4 h-4 text-[#8b95a1]" />
              )
            )}
          </button>

          {/* Mission Sub-Menu */}
          {!isSidebarCollapsed && isMissionOpen && (
            <div className="pl-6 space-y-0.5 pt-0.5">
              <button
                onClick={() => {
                  setActiveTab("mission");
                  if (setMissionSubTab) setMissionSubTab("general");
                }}
                className={`flex items-center gap-2 w-full px-2.5 py-1.5 text-[12px] font-medium rounded-md transition-all cursor-pointer ${
                  activeTab === "mission" && missionSubTab === "general"
                    ? "text-[#191f28] font-bold bg-[#e5e7eb]"
                    : "text-[#8b95a1] hover:text-[#191f28] hover:bg-[#f2f4f6]"
                }`}
              >
                <Layers className={`w-3.5 h-3.5 shrink-0 ${activeTab === "mission" && missionSubTab === "general" ? "text-[#191f28]" : "text-[#8b95a1]"}`} />
                <span>미션 참여 현황</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab("mission");
                  if (setMissionSubTab) setMissionSubTab("reward");
                }}
                className={`flex items-center gap-2 w-full px-2.5 py-1.5 text-[12px] font-medium rounded-md transition-all cursor-pointer ${
                  activeTab === "mission" && missionSubTab === "reward"
                    ? "text-[#191f28] font-bold bg-[#e5e7eb]"
                    : "text-[#8b95a1] hover:text-[#191f28] hover:bg-[#f2f4f6]"
                }`}
              >
                <Gift className={`w-3.5 h-3.5 shrink-0 ${activeTab === "mission" && missionSubTab === "reward" ? "text-[#191f28]" : "text-[#8b95a1]"}`} />
                <span>미션 리워드 현황</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab("mission");
                  if (setMissionSubTab) setMissionSubTab("attendance");
                }}
                className={`flex items-center gap-2 w-full px-2.5 py-1.5 text-[12px] font-medium rounded-md transition-all cursor-pointer ${
                  activeTab === "mission" && missionSubTab === "attendance"
                    ? "text-[#191f28] font-bold bg-[#e5e7eb]"
                    : "text-[#8b95a1] hover:text-[#191f28] hover:bg-[#f2f4f6]"
                }`}
              >
                <Calendar className={`w-3.5 h-3.5 shrink-0 ${activeTab === "mission" && missionSubTab === "attendance" ? "text-[#191f28]" : "text-[#8b95a1]"}`} />
                <span>출석체크 상세</span>
              </button>
            </div>
          )}
        </div>

        {/* 4. 퍼널 분석 (메인 그룹) */}
        <div className="space-y-0.5">
          <button 
            onClick={() => {
              if (activeTab !== "funnel") {
                setActiveTab("funnel");
                setIsFunnelOpen(true);
              } else {
                setIsFunnelOpen(!isFunnelOpen);
              }
            }}
            className={`flex items-center ${isSidebarCollapsed ? "justify-center" : "justify-between"} w-full px-3 py-2.5 text-[13px] font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === "funnel"
                ? "bg-[#e5e7eb] text-[#191f28] font-bold"
                : "text-[#4e5968] hover:text-[#191f28] hover:bg-[#f2f4f6]"
            }`}
            title="퍼널 분석"
          >
            <div className="flex items-center gap-2.5">
              <Filter className={`w-4 h-4 shrink-0 ${activeTab === "funnel" ? "text-[#191f28]" : "text-[#8b95a1]"}`} />
              {!isSidebarCollapsed && <span>퍼널 분석</span>}
            </div>
            {!isSidebarCollapsed && (
              isFunnelOpen ? (
                <ChevronDown className="w-4 h-4 text-[#8b95a1]" />
              ) : (
                <ChevronRight className="w-4 h-4 text-[#8b95a1]" />
              )
            )}
          </button>

          {/* Funnel Sub-Menu */}
          {!isSidebarCollapsed && isFunnelOpen && (
            <div className="pl-6 space-y-0.5 pt-0.5">
              <button
                onClick={() => {
                  setActiveTab("funnel");
                  if (setFunnelCategoryTab) setFunnelCategoryTab("detail");
                }}
                className={`flex items-center gap-2 w-full px-2.5 py-1.5 text-[12px] font-medium rounded-md transition-all cursor-pointer ${
                  activeTab === "funnel" && funnelCategoryTab === "detail"
                    ? "text-[#191f28] font-bold bg-[#e5e7eb]"
                    : "text-[#8b95a1] hover:text-[#191f28] hover:bg-[#f2f4f6]"
                }`}
              >
                <Layers className={`w-3.5 h-3.5 shrink-0 ${activeTab === "funnel" && funnelCategoryTab === "detail" ? "text-[#191f28]" : "text-[#8b95a1]"}`} />
                <span>퍼널 분석 상세</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab("funnel");
                  if (setFunnelCategoryTab) setFunnelCategoryTab("new_user");
                }}
                className={`flex items-center gap-2 w-full px-2.5 py-1.5 text-[12px] font-medium rounded-md transition-all cursor-pointer ${
                  activeTab === "funnel" && funnelCategoryTab === "new_user"
                    ? "text-[#191f28] font-bold bg-[#e5e7eb]"
                    : "text-[#8b95a1] hover:text-[#191f28] hover:bg-[#f2f4f6]"
                }`}
              >
                <UserPlus className={`w-3.5 h-3.5 shrink-0 ${activeTab === "funnel" && funnelCategoryTab === "new_user" ? "text-[#191f28]" : "text-[#8b95a1]"}`} />
                <span>신규 유저 퍼널</span>
              </button>
            </div>
          )}
        </div>

        {/* 5. 매출 현황 (메인 그룹) */}
        <div className="space-y-0.5">
          <button 
            onClick={() => {
              if (activeTab !== "revenue") {
                setActiveTab("revenue");
                setIsRevenueOpen(true);
              } else {
                setIsRevenueOpen(!isRevenueOpen);
              }
            }}
            className={`flex items-center ${isSidebarCollapsed ? "justify-center" : "justify-between"} w-full px-3 py-2.5 text-[13px] font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === "revenue"
                ? "bg-[#e5e7eb] text-[#191f28] font-bold"
                : "text-[#4e5968] hover:text-[#191f28] hover:bg-[#f2f4f6]"
            }`}
            title="매출 현황"
          >
            <div className="flex items-center gap-2.5">
              <DollarSign className={`w-4 h-4 shrink-0 ${activeTab === "revenue" ? "text-[#191f28]" : "text-[#8b95a1]"}`} />
              {!isSidebarCollapsed && <span>매출 현황</span>}
            </div>
            {!isSidebarCollapsed && (
              isRevenueOpen ? (
                <ChevronDown className="w-4 h-4 text-[#8b95a1]" />
              ) : (
                <ChevronRight className="w-4 h-4 text-[#8b95a1]" />
              )
            )}
          </button>

          {/* Depth 2 Sub-Menu */}
          {!isSidebarCollapsed && isRevenueOpen && (
            <div className="pl-6 space-y-0.5 pt-0.5">
              <button
                onClick={() => {
                  setActiveTab("revenue");
                  setRevenueCategoryTab("overall");
                }}
                className={`flex items-center gap-2 w-full px-2.5 py-1.5 text-[12px] font-medium rounded-md transition-all cursor-pointer ${
                  activeTab === "revenue" && (revenueCategoryTab === "overall" || revenueCategoryTab === "ad_category" || revenueCategoryTab === "ad_network" || revenueCategoryTab === "ad")
                    ? "text-[#191f28] font-bold bg-[#e5e7eb]"
                    : "text-[#8b95a1] hover:text-[#191f28] hover:bg-[#f2f4f6]"
                }`}
              >
                <BarChart2 className={`w-3.5 h-3.5 shrink-0 ${activeTab === "revenue" && (revenueCategoryTab === "overall" || revenueCategoryTab === "ad_category" || revenueCategoryTab === "ad_network" || revenueCategoryTab === "ad") ? "text-[#191f28]" : "text-[#8b95a1]"}`} />
                <span>광고 매출 상세</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab("revenue");
                  setRevenueCategoryTab("content_pay");
                }}
                className={`flex items-center gap-2 w-full px-2.5 py-1.5 text-[12px] font-medium rounded-md transition-all cursor-pointer ${
                  activeTab === "revenue" && (revenueCategoryTab === "content" || revenueCategoryTab === "content_pay" || revenueCategoryTab === "content_usage")
                    ? "text-[#191f28] font-bold bg-[#e5e7eb]"
                    : "text-[#8b95a1] hover:text-[#191f28] hover:bg-[#f2f4f6]"
                }`}
              >
                <ShoppingBag className={`w-3.5 h-3.5 shrink-0 ${activeTab === "revenue" && (revenueCategoryTab === "content" || revenueCategoryTab === "content_pay" || revenueCategoryTab === "content_usage") ? "text-[#191f28]" : "text-[#8b95a1]"}`} />
                <span>콘텐츠 매출 상세</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab("revenue");
                  setRevenueCategoryTab("margin");
                }}
                className={`flex items-center gap-2 w-full px-2.5 py-1.5 text-[12px] rounded-md transition-all cursor-pointer ${
                  activeTab === "revenue" && revenueCategoryTab === "margin"
                    ? "text-[#191f28] font-bold bg-[#e5e7eb]"
                    : "text-[#8b95a1] hover:text-[#191f28] hover:bg-[#f2f4f6]"
                }`}
              >
                <Award className={`w-3.5 h-3.5 shrink-0 ${activeTab === "revenue" && revenueCategoryTab === "margin" ? "text-[#191f28]" : "text-[#8b95a1]"}`} />
                <span>손익 마진율</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
