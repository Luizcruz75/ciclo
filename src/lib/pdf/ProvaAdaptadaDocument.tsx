import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, fontFamily: 'Helvetica' },
  cabecalho: { marginBottom: 20, borderBottom: 1, borderColor: '#999999', paddingBottom: 10 },
  linhaCabecalho: { marginBottom: 3 },
  tituloProva: { fontSize: 16, marginTop: 6 },
  questao: { marginBottom: 24 },
  numeroQuestao: { fontSize: 12, marginBottom: 6 },
  enunciado: { marginBottom: 10, lineHeight: 1.4 },
  espacoResposta: { borderWidth: 1, borderColor: '#cccccc', height: 90, borderRadius: 4 },
  rodape: { position: 'absolute', bottom: 20, left: 40, right: 40, fontSize: 9, color: '#777777', textAlign: 'center' },
})

// v1 funcional (sem o refinamento visual completo do DESIGN.md) — PDF é
// gerado sob demanda, nunca pré-gerado/salvo.
export type QuestaoParaPdf = { ordem: number; enunciadoAdaptado: string }

export function ProvaAdaptadaDocument({
  nomeEscola,
  nomeProfessor,
  nomeAluno,
  tituloProva,
  materia,
  anoEscolar,
  questoes,
  dataGeracao,
}: {
  nomeEscola: string
  nomeProfessor: string
  nomeAluno: string
  tituloProva: string
  materia: string
  anoEscolar: number
  questoes: QuestaoParaPdf[]
  dataGeracao: string
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.cabecalho}>
          <Text style={styles.linhaCabecalho}>{nomeEscola}</Text>
          <Text style={styles.linhaCabecalho}>Professor(a): {nomeProfessor}</Text>
          <Text style={styles.linhaCabecalho}>
            Aluno(a): {nomeAluno} — {anoEscolar}º ano
          </Text>
          <Text style={styles.tituloProva}>{tituloProva}</Text>
          <Text style={styles.linhaCabecalho}>
            {materia === 'matematica' ? 'Matemática' : 'Português'}
          </Text>
        </View>

        {questoes.map((questao) => (
          <View key={questao.ordem} style={styles.questao} wrap={false}>
            <Text style={styles.numeroQuestao}>Questão {questao.ordem}</Text>
            <Text style={styles.enunciado}>{questao.enunciadoAdaptado}</Text>
            <View style={styles.espacoResposta} />
          </View>
        ))}

        <Text style={styles.rodape} fixed>
          Gerado em {dataGeracao}
        </Text>
      </Page>
    </Document>
  )
}
