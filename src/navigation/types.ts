export type RootStackParamList = {
  Home: undefined;
  CreateGroup: { groupId?: string };
  GroupDetail: { groupId: string };
  AddMember: { groupId: string };
  Draw: { groupId: string; cycleId: string };
  PaymentTracking: { groupId: string; cycleId: string };
  MemberDetail: { groupId: string; memberId: string };
  MemberPublicView: { token: string };
};
