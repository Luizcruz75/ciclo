import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, fontFamily: 'Helvetica' },
  cabecalho: { marginBottom: 20, borderBottom: 1, borderColor: '#999999', paddingBottom: 10 },
  linhaCabecalho: { marginBottom: 3 },
  tituloProva: { fontSize: 16, marginTop: 6 },
  questao: { marginBottom: 24 },
  numeroQuestao: { fontSize: 12, marginBottom: 6 },
  marcaAdaptada: { fontSize: 10, color: '#3A3ED1' },
  enunciado: { marginBottom: 10, lineHeight: 1.4 },
  espacoResposta: { borderWidth: 1, borderColor: '#cccccc', height: 90, borderRadius: 4 },
  rodape: { position: 'absolute', bottom: 20, left: 40, right: 40, textAlign: 'center' },
  linhaData: { fontSize: 9, color: '#777777' },
  linhaRodapeExtra: { fontSize: 13, color: '#6B6D76', marginTop: 2 },
})

// v1 funcional (sem o refinamento visual completo do DESIGN.md) — PDF é
// gerado sob demanda, nunca pré-gerado/salvo. Toda questão da prova entra
// sempre — adaptada (com marca discreta) ou original — nunca some em
// silêncio (achado de teste: entregar prova incompleta sem aviso).
export type QuestaoParaPdf = { ordem: number; enunciado: string; adaptada: boolean }

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
            <Text style={styles.numeroQuestao}>
              Questão {questao.ordem}
              {questao.adaptada && <Text style={styles.marcaAdaptada}> · adaptada</Text>}
            </Text>
            <Text style={styles.enunciado}>{questao.enunciado}</Text>
            <View style={styles.espacoResposta} />
          </View>
        ))}

        <View style={styles.rodape} fixed>
          <Text style={styles.linhaData}>Gerado em {dataGeracao}</Text>
          <Text style={styles.linhaRodapeExtra}>https://www.linkedin.com/in/luizcruzdf/</Text>
          <Text style={styles.linhaRodapeExtra}>InteligenciA Cruz (em breve)</Text>
        </View>
      </Page>
    </Document>
  )
}
