export const TAGS = {
  // Patient
  patientName:   'x00100010',
  patientID:     'x00100020',
  patientSex:    'x00100040',
  patientWeight: 'x00101030',
  patientSize:   'x00101020',

  // Study / Series
  modality:            'x00080060',
  seriesInstanceUID:   'x0020000e',
  seriesDescription:   'x0008103e',
  acquisitionDate:     'x00080022',
  acquisitionTime:     'x00080032',

  // Image pixel
  rows:               'x00280010',
  cols:               'x00280011',
  bitsAllocated:      'x00280100',
  pixelRepresentation:'x00280103',
  rescaleSlope:       'x00281053',
  rescaleIntercept:   'x00281052',
  pixelData:          'x7fe00010',

  // Instance
  instanceNumber:  'x00200013',
  sliceLocation:   'x00201041',

  // PET-specific
  units:           'x00541001',
  decayCorrection: 'x00541102',
  radiopharmSeq:   'x00540016',

  // Inside RadiopharmaceuticalInformationSequence
  radiopharmaceutical: 'x00180031',
  injectionTime:       'x00181072',
  injectedDose:        'x00181074',
  halfLife:            'x00181075',
}
