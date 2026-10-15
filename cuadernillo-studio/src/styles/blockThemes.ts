
import type { BlockKind } from '../models/document';

export type BlockStyle = {
  border: string;
  background: string;
  headerBackground: string;
  headerText: string;
};

export const blockThemes: Record<BlockKind, BlockStyle> = {
  purpose: {
    border: '#F4C889',
    background: '#FFFFFF',
    headerBackground: '#FFF2DC',
    headerText: '#E65B1F',
  },

  pda: {
    border: '#F4C889',
    background: '#FFFFFF',
    headerBackground: '#FFF2DC',
    headerText: '#E65B1F',
  },

  start: {
    border: '#1357C5',
    background: '#FFFFFF',
    headerBackground: '#E7F0FF',
    headerText: '#1357C5',
  },

  development: {
    border: '#F04B17',
    background: '#FFFFFF',
    headerBackground: '#FFF0E5',
    headerText: '#F04B17',
  },

  question: {
    border: '#F03E32',
    background: '#FFFFFF',
    headerBackground: '#FFE9E5',
    headerText: '#E13B2C',
  },

  case: {
    border: '#7040A3',
    background: '#FFFFFF',
    headerBackground: '#F1E9FA',
    headerText: '#7040A3',
  },

  activity: {
    border: '#1676D2',
    background: '#FFFFFF',
    headerBackground: '#E9F4FF',
    headerText: '#1357C5',
  },

  
    pisa: {
    border: '#9636D9',
    background: '#FFFFFF',
    headerBackground: '#F5EAFD',
    headerText: '#7927BD',
    },

    closing: {
    border: '#F04B17',
    background: '#FFFFFF',
    headerBackground: '#FFF0E5',
    headerText: '#E34318',
    },

    application: {
    border: '#E6A12C',
    background: '#FFFFFF',
    headerBackground: '#FFF5DD',
    headerText: '#A96908',
    },

    selfEvaluation: {
    border: '#23864A',
    background: '#FFFFFF',
    headerBackground: '#E8F5E8',
    headerText: '#176E38',
    },

    information: {
    border: '#7B48B3',
    background: '#FFFFFF',
    headerBackground: '#F3EDFA',
    headerText: '#68369E',
    },

};
